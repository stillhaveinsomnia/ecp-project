import { AccountId } from "../cryptography/cryptography";
import { DataItem } from "./Queries";

// TODO implement correctly

export type ShouldSendProps<StoreItem> = {
  thisAccountId: AccountId;
  otherAccountId: AccountId;
  storeItem: StoreItem;
};

/** This function determines whether an information should be shared */
export function shouldSend({
  thisAccountId,
  otherAccountId,
  storeItem,
}: ShouldSendProps<DataItem>): boolean {
  if (otherAccountId === thisAccountId) {
    if (storeItem.type === "ContactUpdate") {
      if (storeItem.accountId === thisAccountId) {
        return true;
      }
    }
    if (storeItem.type === "DirectMessageUpdate") {
      if (
        storeItem.senderId === thisAccountId ||
        storeItem.receiverId === thisAccountId
      ) {
        return true;
      }
    }
  }

  if (storeItem.type === "DirectMessageUpdate") {
    if (
      (storeItem.senderId === thisAccountId &&
        storeItem.receiverId === otherAccountId) ||
      (storeItem.senderId === otherAccountId &&
        storeItem.receiverId === thisAccountId)
    ) {
      if (!storeItem.isDraft) {
        return true;
      }
    }
  }
  return false;
}
