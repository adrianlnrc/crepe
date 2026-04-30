import { redirect } from "next/navigation";

type Search = Promise<{ event?: string }>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { event } = await searchParams;
  if (event) {
    redirect(`/pedido?event=${encodeURIComponent(event)}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold">Crepe</h1>
      <p className="text-muted-foreground">
        Acesse pelo QR code afixado na festa para fazer seu pedido.
      </p>
    </main>
  );
}
