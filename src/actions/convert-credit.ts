"use server";

import { revalidatePath } from 'next/cache'

import { db } from "@/db";
import { retraitCredit } from "@/db/schema";
import { totalCredit } from "@/db/schema";
import { userTotalCredit } from "@/data/user";
import { getLastWithDraw } from "@/data/user";
import { sendSms } from "./send-sms";

import { eq, sql, sum } from "drizzle-orm";

import * as z from "zod";

import { convertCreditSchema } from "@/secure/credit";

export const ConvertCredit = async ( formData : z.infer<typeof convertCreditSchema> ) => {
  console.log('formData Getting in Action : ', formData);
  const validateFields = convertCreditSchema.safeParse(formData);

  //Vérifie les informations
  if (!validateFields.success) {
    console.log('Erreur de validation : ', validateFields.error)
    return { error : "Votre échange a été Refusé"};
  }

  const { withdraw, quantity, numero, ci, total } = validateFields.data;

  // Securise les echanges
  if (total < withdraw){
    return { error : `Vous n'avez pas assez de crédits.`};
  };

  // Sauvegarder le retrait si tout est bon
  const totalCreditId = await userTotalCredit(ci);
  console.log('totalCreditId : ', totalCreditId);
  
  if (!totalCreditId){
    console.log('Erreur de crédit : ', totalCreditId)
    return {error : 'Erreur de récupération des credits.'}
  }

  const lastWithdraw = await getLastWithDraw(totalCreditId.id);
  console.log('lastWithdraw : ', lastWithdraw);

  if (lastWithdraw?.allowWithdraw) {
    return { error : 'Vous avez déjà éffectué un retrait dans les 24 heures.'}
  }

  let transactionError = null;

  let retraitCreditId = null;

  try {
    //
    await db.transaction(async (tx) => {
      // 
      const result = await tx.insert(retraitCredit).values({
        totalCreditId: totalCreditId.id,
        quantity: withdraw,
        data_forfait: quantity,
        status: 'en attente',
      }).returning({
        id: retraitCredit.id,
      });

      if (!result || !result[0]){
        throw new Error('Erreur de sauvegarde dans retrait de crédit.');
      }

      retraitCreditId = result[0].id;

      //
      const debitCredit = await tx.update(totalCredit).set({
        total_credit: totalCreditId.total_credit - withdraw
      }).where(eq(totalCredit.id, totalCreditId.id));

      if (!debitCredit){
        throw new Error('Erreur de mise à jour de total credit.');
      }

      const message = `Le client ${numero} a effectue une conversion de ${withdraw} c redits pour un forfait de $iquantity} Mo. Mess age de l'application komo1App.`
      const send = await sendSms(message);
      console.log('send SMS : ', send);
      if (!send) {
        console.log('Erreur lors de l\'envoi du SMS : ', send);
        throw new Error('Transaction ::: Erreur lors de l\'envoi du SMS.');
      }
      
    });
  } catch (error) {
    console.error("Erreur lors de la transaction ", error);
    transactionError = error;
  }

  if (transactionError) {

    if (transactionError instanceof Error && transactionError.message.includes('Transaction ::: Erreur lors de l\'envoi du SMS.')) {
      console.log('Problème interne')
      return { error : 'Problème interne, réessayer plus tard.'};
    }

    if (retraitCreditId) {
      try {
        await db.update(retraitCredit).set({ status : 'échec' }).where(eq(retraitCredit.id, retraitCreditId))
      } catch ( updateError) {
        console.error('Erreur lors de la mise à jour de la transaction :', updateError);
      }
    }
    return { error : 'Votre échange a été réjeté.'}
  } else {
    // Si la transaction s'est terminé avec succès, mettre à jour le statut
    if (retraitCreditId){
      try{
        await db.update(retraitCredit).set({ status : 'réussi' }).where(eq(retraitCredit.id, retraitCreditId))
      } catch (updateError) {
        console.error('Erreur lors de la mise à jour de la transaction', updateError);
      }

      revalidatePath(`/retrait/${ci}`)
    }
    return { success : 'Votre échange a été effectué avec succès'}
  }
  ///revalidatePath(`/retrait/${ci}`)
}