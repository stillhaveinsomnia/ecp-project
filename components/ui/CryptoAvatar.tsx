import { funEmoji } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { use, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { AccountId } from "../cryptography/cryptography";
import { FeApiContext } from "../store/feApi";

export function CryptoAvatar({
  accountId,
  contactId,
}: {
  accountId: AccountId;
  contactId: AccountId;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const { store } = use(FeApiContext);
  useEffect(() => {
    let isActive = true;
    let timeoutId = 0 as any;
    const poll = () => {
      if (!isActive) return;
      void store
        .getContactConnectedDevices(accountId)
        .then((connectedDevices) => {
          if (isActive) {
            setIsConnected(connectedDevices.length > 0);
            timeoutId = setTimeout(poll, 1000);
          }
        });
    };
    if (accountId !== contactId) poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      isActive = false;
    };
  }, [accountId, contactId, store]);

  // TODO this loops for some reason
  // const isConnected = useEcpQuery(getContactConnectedDevices, {
  //   contactId: accountId,
  // });

  if (accountId === contactId) {
    return <Avatar accountId={accountId} />;
  }

  return (
    <View style={{ opacity: isConnected ? 1 : 0.2 }}>
      <Avatar accountId={contactId} />
    </View>
  );
}

function Avatar({ accountId }: { accountId: AccountId }) {
  const size = 44;
  const svg = useMemo(
    () => createAvatar(funEmoji, { seed: accountId, size: size }).toString(),
    [accountId, size],
  );
  return <SvgXml xml={svg} width={size} height={size} />;
}
