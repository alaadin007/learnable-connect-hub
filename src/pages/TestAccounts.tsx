
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Add missing type for setTestUser in AuthContext
type TestUserType = { 
  email: string; 
  password: string; 
  role: string;
  name?: string;
};

interface ExtendedAuthContext {
  setTestUser?: (user: TestUserType) => void;
}

const TestAccounts = () => {
  // Cast useAuth() result to include the optional setTestUser function
  const auth = useAuth() as ExtendedAuthContext;

  const handleLoginAs = (account: { email: string; password: string; role: string; name?: string }) => {
    // Only call if available
    if (auth.setTestUser) {
      auth.setTestUser(account);
    } else {
      console.warn('setTestUser function is not available in the auth context');
    }
  };

  const testAccounts = [
    { email: 'student@example.com', password: 'password', role: 'student', name: 'Test Student' },
    { email: 'teacher@example.com', password: 'password', role: 'teacher', name: 'Test Teacher' },
    { email: 'admin@example.com', password: 'password', role: 'school_admin', name: 'Test Admin' },
  ];

  return (
    <div>
      <h2>Login as Test Account</h2>
      <ul>
        {testAccounts.map(account => (
          <li key={account.email}>
            <button onClick={() => handleLoginAs(account)}>
              {account.name} ({account.role})
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TestAccounts;
