import { DataItem } from "../queries/Queries";

export function compactData(data: DataItem[], maxMessagesPerChat = 5000): DataItem[] {
  // Count messages per chat
  const messageCounts = new Map<string, number>();

  // We iterate backwards to keep the newest messages
  const result: DataItem[] = [];
  
  for (let i = data.length - 1; i >= 0; i--) {
    const item = data[i];
    
    let chatId: string | null = null;
    
    if (item.type === "DirectMessageUpdate") {
      const p1 = item.senderId;
      const p2 = item.receiverId;
      chatId = `dm_${p1 < p2 ? p1 + "_" + p2 : p2 + "_" + p1}`;
    } else if (item.type === "GroupMessageUpdate") {
      chatId = `group_${item.groupId}`;
    }
    
    if (chatId) {
      const count = messageCounts.get(chatId) || 0;
      if (count >= maxMessagesPerChat) {
        // Skip this message, it exceeds the limit (we're going newest to oldest)
        continue;
      }
      messageCounts.set(chatId, count + 1);
    }
    
    result.push(item);
  }

  // Since we iterated backwards, reverse it back to chronological order
  return result.reverse();
}
