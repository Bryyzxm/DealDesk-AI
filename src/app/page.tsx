import { CommandPalette } from "./command-palette";
import { DealIntakeForm } from "./deal-intake-form";
import { MESSY_DEAL_REQUEST_FIXTURE } from "@/fixtures/messy-deal-request";

type HomeProps = {
  readonly searchParams: Promise<{ readonly fixture?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { fixture } = await searchParams;

  return (
    <>
      <CommandPalette />
      <DealIntakeForm initialInput={fixture === "messy" ? MESSY_DEAL_REQUEST_FIXTURE : undefined} />
    </>
  );
}
