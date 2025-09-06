import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 64px);
  text-align: center;
  padding: 2rem;
  color: #333;
`;

const Code = styled.div`
  font-size: 6rem;
  font-weight: 700;
  color: #e23e57;
  margin-bottom: 0.5rem;
`;

const Title = styled.h1`
  margin: 0.25rem 0 1rem;
  font-size: 1.75rem;
`;

const Message = styled.p`
  margin: 0 0 1.5rem;
  color: #666;
`;

const HomeLink = styled(Link)`
  display: inline-block;
  padding: 0.6rem 1rem;
  background: #1976d2;
  color: #fff;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;

  &:hover {
    background: #155fa0;
  }
`;

const NotFound: React.FC = () => {
  return (
    <Wrapper>
      <Code>404</Code>
      <Title>Page not found</Title>
      <Message>The page you are looking for doesn't exist or has been moved.</Message>
      <HomeLink to="/">Go back to Home</HomeLink>
    </Wrapper>
  );
};

export default NotFound;