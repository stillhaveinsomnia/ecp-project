import { useLingui } from "@lingui/react/macro";
import { Fragment, useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { AccountId } from "../cryptography/cryptography";
import { getArticle, updateArticle } from "../queries/articles";
import { nowTimestamp, Timestamp } from "../queries/Timestamp";
import { useEcpMutation, useEcpQuery } from "../store/dataApi";
import { useTheme } from "../Theme";
import { DateTimeInput } from "../ui/DateTimeInput";
import { ScreenLink } from "../ui/ScreenLink";
import { ArticlesScreen } from "./ArticlesScreen";

export function EditArticleScreen({
  accountId,
  createdAt,
}: {
  accountId: AccountId;
  createdAt?: Timestamp;
}) {
  const { t } = useLingui();
  const theme = useTheme();

  const latest = useEcpQuery(getArticle, {
    accountId,
    createdAt: createdAt,
  }) ?? { date: undefined, content: "" };

  const update = useEcpMutation(updateArticle);

  const dateTimestampOriginal = latest.date?.timestamp;
  const [dateTimestampInput, setDateTimestampInput] = useState(
    dateTimestampOriginal,
  );
  useEffect(() => {
    setDateTimestampInput(dateTimestampOriginal);
  }, [dateTimestampOriginal]);

  const [contentInput, setContentInput] = useState("");
  const contentOriginal = latest.content;
  useEffect(() => {
    setContentInput(contentOriginal);
  }, [contentOriginal]);

  const canSave =
    contentInput !== contentOriginal ||
    dateTimestampInput !== dateTimestampOriginal;

  return (
    <Fragment>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <ScreenLink
          to={!canSave ? <ArticlesScreen accountId={accountId} /> : undefined}
          icon="arrow-left"
          hideLabel
          label={t`Go to articles`}
        />
        {createdAt ? (
          <Text style={[theme.textStyle, { flexGrow: 1 }]}>
            {new Date(createdAt).toLocaleString()}
          </Text>
        ) : (
          <Text style={[theme.secondaryTextStyle, { flexGrow: 1 }]}>
            {t`New article`}
          </Text>
        )}
        <View style={{ flexDirection: "row" }}>
          <ScreenLink
            to={
              !canSave && createdAt
                ? async () => {
                    await update({
                      accountId,
                      createdAt,
                      date: undefined,
                      content: "",
                    });
                    return <ArticlesScreen accountId={accountId} />;
                  }
                : undefined
            }
            icon="trash"
            hideLabel
            label={t`Delete article`}
          />
          <ScreenLink
            to={
              canSave && createdAt
                ? async () => {
                    setContentInput(contentOriginal);
                  }
                : undefined
            }
            icon="undo"
            hideLabel
            label={t`Discard changes`}
          />
          <ScreenLink
            to={
              canSave
                ? async () => {
                    const dateInput = dateTimestampInput
                      ? { timestamp: dateTimestampInput, duration: 0 }
                      : undefined;
                    if (createdAt) {
                      await update({
                        accountId,
                        createdAt,
                        date: dateInput,
                        content: contentInput,
                      });
                    } else {
                      const now = nowTimestamp();
                      await update({
                        accountId,
                        createdAt: now,
                        date: dateInput,
                        content: contentInput,
                      });
                      return (
                        <EditArticleScreen
                          accountId={accountId}
                          createdAt={now}
                        />
                      );
                    }
                  }
                : undefined
            }
            icon="save"
            hideLabel
            label={createdAt ? t`Update article` : t`Create article`}
          />
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ gap: 2, paddingVertical: 8 }}>
          <Text style={[theme.secondaryTextStyle, { paddingHorizontal: 16 }]}>
            {t`Event`}
          </Text>
          <DateTimeInput
            value={dateTimestampInput}
            onChange={setDateTimestampInput as any}
          />
        </View>
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 2 }}>
          <TextInput
            value={contentInput}
            onChangeText={setContentInput}
            style={theme.textInputStyle(contentInput)}
            placeholderTextColor={theme.secondaryTextColor}
            multiline
          />
          {contentInput !== contentOriginal ? (
            <Text
              style={[
                theme.secondaryTextStyle,
                { textDecorationLine: "line-through" },
              ]}
            >
              {contentOriginal || " "}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Fragment>
  );
}
