import * as z from "zod";
import { AccountId, AccountIdSchema } from "../cryptography/cryptography";
import { EcpMutation, EcpQuery } from "../store/feApi";
import { contactList } from "./contacts";
import { maxBy } from "./helpers";
import { DataItem } from "./Queries";
import { nowTimestamp, TimestampSchema } from "./Timestamp";

const BioLocationSchema = z
  .object({ latitude: z.number(), longitude: z.number() })
  .optional();

export const BiographyUpdateSchema = z.object({
  type: z.literal("BiographyUpdate"),
  accountId: AccountIdSchema,
  location: BioLocationSchema,
  content: z.string(),
  timestamp: TimestampSchema,
});

type BioLocation = z.infer<NonNullable<typeof BioLocationSchema>>;

export const updateBiography: EcpMutation<{
  accountId: AccountId;
  location: BioLocation | undefined;
  content: string;
}> =
  ({ accountId, location, content }) =>
  async ({ appStorage }) => {
    await appStorage.write((current) => {
      return {
        ...current,
        data: [
          ...current.data,
          {
            type: "BiographyUpdate",
            accountId,
            location,
            content,
            timestamp: nowTimestamp(),
          },
        ],
      };
    });
  };

function biographyLatest({ accountId }: { accountId: AccountId }) {
  return (all: Array<DataItem>) => {
    const updates = all
      .filter((item) => item.type === "BiographyUpdate")
      .filter((update) => update.accountId === accountId);
    if (updates.length) {
      const latestUpdate = maxBy(updates, (update) => update.timestamp);
      return { location: latestUpdate.location, content: latestUpdate.content };
    }
  };
}

export const getBiography: EcpQuery<
  { accountId: AccountId },
  { content: string; location: BioLocation | undefined } | undefined
> =
  ({ accountId }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    return biographyLatest({ accountId })(all);
  };

export const getBiographies: EcpQuery<
  { accountId: AccountId },
  Array<{
    contactId: AccountId;
    contactName: string;
    content: string;
    location: BioLocation | undefined;
  }>
> =
  ({ accountId }) =>
  async ({ appStorage }) => {
    const current = await appStorage.read();
    const all = current.data;
    const contacts = contactList({ accountId })(all);
    return contacts.flatMap((contact) => {
      const biography = biographyLatest({ accountId: contact.contactId })(all);
      if (biography) {
        return [
          {
            contactId: contact.contactId,
            contactName: contact.name,
            content: biography.content,
            location: biography.location,
          },
        ];
      }
      return [];
    });
  };
