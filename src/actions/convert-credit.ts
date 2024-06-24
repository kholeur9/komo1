"use server";

import { revalidatePath } from 'next/cache'

import { db } from "@/db";
import { retraitCredit } from "@/db/schema";
import { totalCredit } from "@/db/schema";
import { userTotalCredit } from "@/data/user";
import { getLastWithDraw } from "@/data/user";

import { eq, sql, sum } from "drizzle-orm";

import * as z from "zod";

import { convertCreditSchema } from "@/secure/credit";

export const ConvertCredit = async ( formData : z.infer<typeof convertCreditSchema> ) => {
  console.log("Action", formData)
  
  const validateFields = convertCreditSchema.safeParse(formData);

  const { withdraw, quantity, numero, ci, total } = validateFields.data;

  //Vérifie les informations
  if (!validateFields.success) {
    return { error : "Refusé"};
  }

  // Securise les echanges
  if (total < withdraw){
    return { error : `Vous avez moins de ${withdraw} crédits pour un échange de ${quantity} Mo`};
  };

  // Sauvegarder le retrait si tout est bon
  const totalCreditId = await userTotalCredit(ci);
  
  if (!totalCreditId){
    console.log('Non recupéré !!');
    return {error : 'Erreur de récupération des credits.'}
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
      
    });
  } catch (error) {
    console.error("Erreur lors de la transaction ", error);
    transactionError = error;
  }

  if (transactionError) {

    if (retraitCreditId) {
      try {
        await db.update(retraitCredit).set({ status : 'échec' }).where(eq(retraitCredit.id, retraitCreditId))
      } catch ( updateError) {
        console.error('Erreur lors de la mise à jour de la transaction :', updateError);
      }
    }
    return { error : 'La demande a échoué'}
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
    return { success : 'Accordé'}
  }
  revalidatePath(`/retrait/${ci}`)
}