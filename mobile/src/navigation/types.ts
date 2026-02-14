import type { NavigatorScreenParams } from '@react-navigation/native';

export type LibraryStackParamList = {
  Library: undefined;
  ProjectDetail: { projectId: number; projectName: string };
};

export type RootTabParamList = {
  LibraryTab: NavigatorScreenParams<LibraryStackParamList>;
  NowPlayingTab: undefined;
  SettingsTab: undefined;
};
