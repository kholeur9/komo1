import { Login } from "@/features/auth/login";
import Image from "next/image";

interface LoginPageProps {
  params: { slug : string };
}

export default function LoginPage({ params } : LoginPageProps ) {
  const admin = params.slug === "admin";
  const client = params.slug === "client";
  return (
    <div className="h-full flex flex-col py-2.5 px-6">
      <div className="w-full flex flex-col items-center justify-center py-2.5 gap-2.5  absolute bottom-0 right-0 left-0">
        <div className="w-full flex items-center justify-center gap-2.5">
          <p className="text-white text-[9px] text-center">
            <a href="#">
            2024 Komo1 - Tous les droits réservés.
            </a>
          </p>
          <p className="text-white text-[9px] text-center">
            <a href="#">
              Powered and Secured by Prima-Tech.
            </a>
          </p>
        </div>
      </div>
      <div className="h-full flex flex-col space-y-8">
        <div className="flex flex-col py-1.5">
          <div className="w-[50px] h-50px] rounded-full overflow-hidden">
            <Image src="/logo.jpeg" alt="KOMO1" width={100} height={100} className="w-full" />
          </div>
          <h1 className="text-[30px] font-bold tracking-tight text-white sm:text-4xl md:text-4xl">
            { admin && "Bienvenue Admin"}
            { client && "Bienvenue sur Komo1"}
          </h1>
          <p className="mt-0.5 max-w-md text-md text-white sm:text-xl md:mt-0.5 md:text-xl md:max-w-3xl">
            { params.slug === 'admin' && "Connectez-vous pour accéder à votre espace administrateur."}
            { params.slug === 'client' && "Echanger vos crédits en forfait internet."}
          </p>
        </div>
        <Login admin={params.slug} />
      </div>
    </div>
  )
}