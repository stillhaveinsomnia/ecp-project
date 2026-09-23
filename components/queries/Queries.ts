import * as z from "zod";
import { ArticleUpdateSchema } from "./articles";
import { BiographyUpdateSchema } from "./biography";
import {
  ContactListMembershipUpdateSchema,
  ContactListUpdateSchema,
} from "./contactList";
import { ContactUpdateSchema } from "./contacts";
import {
  DidReadDirectMessageUpdateSchema,
  DirectMessageUpdateSchema,
} from "./directMessages";
import { GroupMessageUpdateSchema } from "./groupMessages";
import { GroupUpdateSchema } from "./groups";

export const DataItemSchema = z.discriminatedUnion("type", [
  ContactUpdateSchema,
  ContactListUpdateSchema,
  ContactListMembershipUpdateSchema,
  DirectMessageUpdateSchema,
  DidReadDirectMessageUpdateSchema,
  GroupUpdateSchema,
  GroupMessageUpdateSchema,
  ArticleUpdateSchema,
  BiographyUpdateSchema,
]);

export type DataItem = z.infer<typeof DataItemSchema>;
