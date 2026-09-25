// ============================================================
//  stripe-webhook
//  Endpoint que Stripe llama directamente (no el navegador).
//  Escucha dos eventos:
//    - account.updated        -> marca client_payments.charges_enabled
//                                 cuando el cliente termina su
//                                 onboarding de Stripe Connect.
//    - checkout.session.completed -> marca el pedido como pagado.
//
//  Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
//           (--no-verify-jwt porque Stripe llama sin un JWT de
//           Supabase; la seguridad la da la firma de Stripe, no
//           la auth de Supabase)
//  Secrets: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//
//  Despues de desplegar, da de alta este endpoint en el Dashboard
//  de Stripe (Developers -> Webhooks) apuntando a:
//    https://<project-ref>.supabase.co/functions/v1/stripe-webhook
//  suscrito a los eventos "account.updated" y
//  "checkout.session.completed".
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? "", webhookSecret);
  } catch (e) {
    console.error("[stripe-webhook] Firma invalida:", e);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await sb
          .from("client_payments")
          .update({
            charges_enabled: !!account.charges_enabled,
            onboarded_at: account.charges_enabled ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_account_id", account.id);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (orderId) {
          await sb
            .from("orders")
            .update({
              payment_status: "pagado",
              stripe_payment_intent_id: (session.payment_intent as string) || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId)
            .eq("stripe_checkout_session_id", session.id);
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("[stripe-webhook] Error procesando evento:", e);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
