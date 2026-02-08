import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { LibraryView } from '../views/LibraryView';
import { ProjectDetailView } from '../views/ProjectDetailView';
import { SettingsView } from '../views/SettingsView';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <LibraryView /> },
      { path: 'project/:id', element: <ProjectDetailView /> },
      { path: 'settings', element: <SettingsView /> },
    ],
  },
]);
