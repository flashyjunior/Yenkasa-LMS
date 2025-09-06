import React from 'react';

// Use emoji fallbacks for icons to ensure stable rendering in the app
export const DashboardIcon = () => <span aria-hidden>📊</span>;
export const CoursesIcon = () => <span aria-hidden>📚</span>;
export const LessonsIcon = () => <span aria-hidden>⚡</span>;
export const QuizzesIcon = () => <span aria-hidden>📝</span>;
export const ProfileIcon = () => <span aria-hidden>👤</span>;
export const AdminIcon = () => <span aria-hidden>🛠️</span>;
export const HistoryIcon = () => <span aria-hidden>🕘</span>;
export const CompletedIcon = () => <span aria-hidden>✅</span>;
export const LogoutIcon = () => <span aria-hidden>🚪</span>;
export const CreateIcon = () => <span aria-hidden>➕</span>;

// New vector icons for chat and notifications — render safely if the import is an element or component
export const ChatIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
	<span role="img" aria-label="chat" style={{ fontSize: size }}>💬</span>
);

export const BellIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
	<span role="img" aria-label="notifications" style={{ fontSize: size }}>🔔</span>
);

export const RolesIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
	<span role="img" aria-label="roles" style={{ fontSize: size }}>🛡️</span>
);

// Note: react-icons removed to avoid runtime issues; emojis used as stable fallbacks.
