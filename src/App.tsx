import './App.css'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/useAuth.ts'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { PublicOnlyRoute } from './components/PublicOnlyRoute.tsx'
import { LoadingScreen } from './components/LoadingScreen.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Calendar } from './pages/Calendar.tsx'
import { Login } from './pages/Login.tsx'
import { NoteDetails } from './pages/NoteDetails.tsx'
import { Notes } from './pages/Notes.tsx'
import { ProjectDetails } from './pages/ProjectDetails.tsx'
import { Projects } from './pages/Projects.tsx'
import { Settings } from './pages/Settings.tsx'
import { Analytics } from './pages/Analytics.tsx'
import { Expenses } from './pages/Expenses.tsx'
import { Files } from './pages/Files.tsx'
import { Inventory } from './pages/Inventory.tsx'
import { InventoryDetail } from './pages/InventoryDetail.tsx'
import { InventoryScan } from './pages/InventoryScan.tsx'
import { Reviewer } from './pages/Reviewer.tsx'
import { ReviewerDetail } from './pages/ReviewerDetail.tsx'
import { ReviewerQuiz } from './pages/ReviewerQuiz.tsx'
import { Assistant } from './pages/Assistant.tsx'
import { Notifications } from './pages/Notifications.tsx'
import { Register } from './pages/Register.tsx'
import { Study } from './pages/Study.tsx'
import { SubjectDetails } from './pages/SubjectDetails.tsx'
import { Subjects } from './pages/Subjects.tsx'
import { TaskDetails } from './pages/TaskDetails.tsx'
import { Tasks } from './pages/Tasks.tsx'
import { Vault } from './pages/Vault.tsx'
import { Profile } from './pages/Profile.tsx'
import { DashboardLayout } from './layouts/DashboardLayout.tsx'
import { NotFound } from './pages/NotFound.tsx'

function HomeRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Navigate to={user ? '/dashboard' : '/login'} replace />
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="subjects/:subjectId" element={<SubjectDetails />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/:taskId" element={<TaskDetails />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="notes" element={<Notes />} />
            <Route path="notes/:noteId" element={<NoteDetails />} />
            <Route path="reviewer" element={<Reviewer />} />
            <Route path="reviewer/:reviewerId" element={<ReviewerDetail />} />
            <Route path="reviewer/:reviewerId/quiz" element={<ReviewerQuiz />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<ProjectDetails />} />
            <Route path="study" element={<Study />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/scan" element={<InventoryScan />} />
            <Route path="inventory/:itemId" element={<InventoryDetail />} />
            <Route path="vault" element={<Vault />} />
            <Route path="files" element={<Files />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
