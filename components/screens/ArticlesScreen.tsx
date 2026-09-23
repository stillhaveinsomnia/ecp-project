import { FontAwesome } from "@expo/vector-icons";
import { useLingui } from "@lingui/react/macro";
import { Fragment } from "react";
import { FlatList, Text, View } from "react-native";
import { AccountId } from "../cryptography/cryptography";
import { getArticles } from "../queries/articles";
import { useEcpQuery } from "../store/dataApi";
import { useTheme } from "../Theme";
import { BottomTabNavigation } from "../ui/BottomTabNavigation";
import { ScreenLink } from "../ui/ScreenLink";
import { EditArticleScreen } from "./EditArticleScreen";
import { ProfileScreen } from "./ProfileScreen";

export function ArticlesScreen({ accountId }: { accountId: AccountId }) {
  const { t } = useLingui();
  const theme = useTheme();

  const articles = useEcpQuery(getArticles, { accountId });

  return (
    <Fragment>
      <View style={{ flexDirection: "row" }}>
        <View style={{ flexGrow: 1 }} />
        <ScreenLink
          to={<EditArticleScreen accountId={accountId} />}
          icon="pencil"
          label={t`Create new article`}
        />
      </View>
      <FlatList
        data={articles}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <ScreenLink
                to={
                  <ProfileScreen
                    accountId={accountId}
                    contactId={item.contactId}
                  />
                }
                label={item.contactName}
                styleOverride={{ flexGrow: 1 }}
              />
              {item.contactId === accountId ? (
                <ScreenLink
                  to={
                    <EditArticleScreen
                      accountId={accountId}
                      createdAt={item.createdAt}
                    />
                  }
                  icon="pencil"
                  hideLabel
                  label={t`Edit article`}
                />
              ) : null}
              <Text style={theme.secondaryTextStyle}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
            {item.date && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <FontAwesome
                  name="calendar"
                  color={theme.secondaryTextColor}
                  size={18}
                />
                <Text style={theme.secondaryTextStyle}>
                  {new Date(item.date.timestamp).toLocaleString()}
                  {/*  {" - "} {new Date(
                    item.date.timestamp + item.date.duration
                  ).toLocaleString()} */}
                </Text>
              </View>
            )}
            <Text style={theme.textStyle}>{item.content}</Text>
          </View>
        )}
        style={{ flex: 1, marginVertical: 8 }}
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={() => (
          <Text style={[theme.secondaryTextStyle, { textAlign: "center" }]}>
            {t`No articles`}
          </Text>
        )}
      />
      <BottomTabNavigation accountId={accountId} enabled={true} />
    </Fragment>
  );
}
