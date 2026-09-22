import { Fragment } from "react";
import { FlatList } from "react-native";
import { AccountId } from "../cryptography/cryptography";
import { useTheme } from "../Theme";
import { BottomTabNavigation } from "../ui/BottomTabNavigation";
import { ScreenLink } from "../ui/ScreenLink";
import { WorkInProgressScreen } from "./WorkInProgressScreen";

// TODO scaffold only, real feature not implemented yet; each category below
// links to a generic work-in-progress placeholder

const CATEGORIES: Array<{
  label: string;
  icon: Parameters<typeof ScreenLink>[0]["icon"];
}> = [
  { label: "Music, Podcasts", icon: "music" },
  { label: "Series, Anime", icon: "television" },
  { label: "Movies, Documentaries, Videos", icon: "film" },
  { label: "Audiobooks, Audiobook series", icon: "headphones" },
  { label: "Manga, Comics", icon: "comment" },
  { label: "Books, Graphic novel", icon: "book" },
  { label: "Book Series, Magazines", icon: "bookmark" },
  { label: "Photos, Slideshows", icon: "picture-o" },
];

export function MultimediaScreen({ accountId }: { accountId: AccountId }) {
  const theme = useTheme();

  return (
    <Fragment>
      <FlatList
        style={{ flex: 1 }}
        data={CATEGORIES}
        keyExtractor={(item) => item.label}
        renderItem={({ item }) => (
          <ScreenLink
            to={
              <WorkInProgressScreen accountId={accountId} title={item.label} />
            }
            icon={item.icon}
            label={item.label}
            styleOverride={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: theme.separatorColor,
            }}
          />
        )}
      />
      <BottomTabNavigation accountId={accountId} enabled={true} />
    </Fragment>
  );
}
