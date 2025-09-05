

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import api from '../api';

// Styled Components (moved to top to avoid 'used before declaration' errors)
const DashboardContainer = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
`;

const SummaryCards = styled.div`
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
`;

const SummaryCard = styled.div`
  flex: 1;
  background: #f2f2f2;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
`;

const SummaryValue = styled.div`
  font-size: 2.5rem;
  font-weight: bold;
  color: #1976d2;
  margin-top: 0.5rem;
`;

const ChartSection = styled.div`
  margin-bottom: 2rem;
`;

const BarChart = styled.div`
  display: flex;
  align-items: flex-end;
  height: 120px;
  gap: 18px;
  margin-top: 1.5rem;
`;

const Bar = styled.div<{ height: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  width: 48px;
  height: 100%;
  position: relative;
  & > span {
    margin-top: 6px;
  }
  &::before {
    content: '';
    display: block;
    width: 100%;
    height: ${({ height }) => Math.max(10, height * 10)}px;
    background: #00bfae;
    border-radius: 8px 8px 0 0;
    transition: height 0.7s;
  }
`;

const BarValue = styled.div`
  position: absolute;
  top: -28px;
  font-size: 1.1rem;
  color: #1976d2;
  font-weight: 600;
`;

const BarLabel = styled.span`
  font-size: 0.95rem;
  color: #444;
  margin-top: 8px;
  text-align: center;
`;

const Section = styled.div`
  margin-bottom: 2.5rem;
`;

const AdminDashboard: React.FC = () => {

  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [enrollments, setEnrollments] = useState<{ label: string; value: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  function fetchData() {
    Promise.all([
      api.get('/api/lms/users'),
      axios.get('/api/lms/courses'),
      axios.get('/api/lms/quizzes'),
  api.get('/api/lms/progress')
    ]).then(([usersRes, coursesRes, quizzesRes, progressRes]) => {
      setUsers(usersRes.data as any[]);
      setCourses(coursesRes.data as any[]);
      setQuizzes(quizzesRes.data as any[]);
      setProgress((progressRes.data as { completedLessons: number }).completedLessons);
      // Use top 5 courses by enrollments (or fallback to all if less than 5)
      const topCourses = (coursesRes.data as any[])
        .sort((a, b) => (b.enrollments || 0) - (a.enrollments || 0))
        .slice(0, 5)
        .map((c: any) => ({ label: c.title, value: c.enrollments || 0 }));
      setEnrollments(topCourses);
      setError(null);
    }).catch((err) => {
      if (err.response && err.response.status === 403) {
        setError('You are not authorized to view this data. Please log in with the correct permissions.');
      } else {
        setError('An error occurred while loading admin dashboard data.');
      }
      setUsers([]);
      setCourses([]);
      setQuizzes([]);
      setProgress(0);
      setEnrollments([]);
    });
  }

  const handleCoursePublishToggle = async (c: any) => {
    if (c.published) {
      await axios.put(`/api/lms/courses/${c.id}`, { ...c, published: false });
    } else {
      await axios.put(`/api/lms/courses/${c.id}/publish`);
    }
    fetchData();
  };

  const handleLessonPublishToggle = async (l: any) => {
    if (l.published) {
      await axios.put(`/api/lms/lessons/${l.id}`, { ...l, published: false });
    } else {
      await axios.put(`/api/lms/lessons/${l.id}/publish`);
    }
    fetchData();
  };

  const handleQuizPublishToggle = async (q: any) => {
    if (q.published) {
      await axios.put(`/api/lms/quizzes/${q.id}`, { ...q, published: false });
    } else {
      await axios.put(`/api/lms/quizzes/${q.id}/publish`);
    }
    fetchData();
  };

  if (error) {
    return (
      <div className="admin-dashboard card fade-in">
        <h2 style={{ color: 'red' }}>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <DashboardContainer>
      <h2>Admin Dashboard</h2>
      <SummaryCards>
        <SummaryCard>
          <h4>Total Users</h4>
          <SummaryValue>{users.length}</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <h4>Total Courses</h4>
          <SummaryValue>{courses.length}</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <h4>Total Quizzes</h4>
          <SummaryValue>{quizzes.length}</SummaryValue>
        </SummaryCard>
      </SummaryCards>
      <ChartSection>
        <h4>Top 5 Course Enrollments</h4>
        <BarChart>
          {enrollments.map((e: { label: string; value: number }, i: number) => (
            <Bar key={e.label} height={e.value}>
              <BarValue>{e.value}</BarValue>
              <BarLabel>{e.label}</BarLabel>
            </Bar>
          ))}
        </BarChart>
      </ChartSection>
      {/* <Section>
        <h4>Users</h4>
        <ul>
          {users.map((u: any) => (
            <li key={u.id}>{u.userName} ({u.email})</li>
          ))}
        </ul>
      </Section>
      <Section>
        <h4>Courses</h4>
        <ul>
          {courses.map((c: any) => (
            <li key={c.id}>
              {c.title} - {c.published ? 'Published' : 'Unpublished'}
              <button onClick={() => handleCoursePublishToggle(c)}>
                {c.published ? 'Unpublish' : 'Publish'}
              </button>
            </li>
          ))}
        </ul>
      </Section>
      <Section>
        <h4>Lessons</h4>
        <ul>
          {courses.flatMap((c: any) => (c.lessons || [])).map((l: any) => (
            <li key={l.id}>
              {l.title} - {l.published ? 'Published' : 'Unpublished'}
              <button onClick={() => handleLessonPublishToggle(l)}>
                {l.published ? 'Unpublish' : 'Publish'}
              </button>
            </li>
          ))}
        </ul>
      </Section>
      <Section>
        <h4>Quizzes</h4>
        <ul>
          {quizzes.map((q: any) => (
            <li key={q.id}>
              {q.question} - {q.published ? 'Published' : 'Unpublished'}
              <button onClick={() => handleQuizPublishToggle(q)}>
                {q.published ? 'Unpublish' : 'Publish'}
              </button>
            </li>
          ))}
        </ul>
      </Section> */}
    </DashboardContainer>
  );
}
export default AdminDashboard;
