
// Import necessary libraries and clients
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Populates test accounts with sample session data
 * @param studentId - The ID of the student
 * @param schoolId - The ID of the school
 * @param sessionCount - Number of sessions to create (default: 10)
 */
export const populateTestAccountWithSessions = async (
  studentId: string,
  schoolId: string,
  sessionCount = 10
) => {
  // Topics that will be used for mock sessions
  const topics = [
    'Algebra',
    'Geometry',
    'Calculus',
    'Biology',
    'Chemistry',
    'Physics',
    'American History',
    'World History',
    'Literature',
    'Grammar',
    'Spanish',
    'French',
    'Psychology',
    'Economics',
    'Computer Science',
    'Art History',
    'Music Theory'
  ];

  // Generate random sessions spread over the last month
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Create a batch of sessions
  const sessions = [];
  for (let i = 0; i < sessionCount; i++) {
    // Random date between one month ago and now
    const randomTime = oneMonthAgo.getTime() + Math.random() * (now.getTime() - oneMonthAgo.getTime());
    const sessionDate = new Date(randomTime);
    
    // Random end time (between 15 minutes and 2 hours after start)
    const sessionEndTime = new Date(sessionDate.getTime() + (15 + Math.random() * 105) * 60 * 1000);
    
    // Random topic from our list
    const topic = topics[Math.floor(Math.random() * topics.length)];
    
    // Random query count (between 3 and 15)
    const queryCount = Math.floor(Math.random() * 13) + 3;
    
    // Generate performance metrics
    const performanceMetric = {
      questionsAnswered: queryCount,
      averageResponseTime: Math.floor(Math.random() * 20) + 5,
      sessionRating: Math.floor(Math.random() * 5) + 1,
      conceptsLearned: Math.floor(Math.random() * 3) + 1,
      completionTime: sessionEndTime.toISOString(),
      conversationsViewed: Math.floor(Math.random() * 3)
    };
    
    sessions.push({
      id: uuidv4(),
      user_id: studentId,
      school_id: schoolId,
      topic_or_content_used: topic,
      session_start: sessionDate.toISOString(),
      session_end: sessionEndTime.toISOString(),
      num_queries: queryCount,
      performance_metric: performanceMetric,
      created_at: sessionDate.toISOString()
    });
  }

  // For test accounts, we directly insert into the database
  try {
    const { error } = await supabase.from('session_logs').insert(sessions);
    
    if (error) {
      console.error('Error creating test session logs:', error);
      return false;
    }
    
    console.log(`Created ${sessionCount} test sessions for student ${studentId}`);
    return true;
  } catch (error) {
    console.error('Exception creating test session logs:', error);
    return false;
  }
};

/**
 * Generate mock conversations with metadata for test users
 * @param userId User ID to create conversations for
 * @param schoolId School ID associated with the user
 */
export const generateMockConversations = async (userId: string, schoolId: string) => {
  try {
    const mockTopics = [
      "Algebra equations",
      "World War II", 
      "Chemical reactions",
      "Shakespeare's Macbeth",
      "Programming basics"
    ];
    
    const mockCategories = ["Homework", "Exam Prep", "Research", "Project", "General Question"];
    
    const now = new Date();
    
    // Create several conversations with metadata
    for (let i = 0; i < 5; i++) {
      const topic = mockTopics[i];
      const category = mockCategories[i];
      const summary = `Study session about ${topic} focused on ${Math.random() > 0.5 ? 'understanding concepts' : 'solving problems'}`;
      const tags = [topic.split(' ')[0].toLowerCase(), topic.split(' ')[1].toLowerCase(), category.toLowerCase()];
      
      const timestamp = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)).toISOString();
      
      // Create conversation entry
      const { data: convo, error: convoError } = await supabase.from('conversations').insert({
        user_id: userId,
        school_id: schoolId,
        topic,
        title: `${topic} study session`,
        summary,
        category,
        tags,
        starred: i === 0 || i === 2,
        last_message_at: timestamp,
        created_at: timestamp
      }).select().single();
      
      if (convoError) {
        console.error("Error creating mock conversation:", convoError);
        continue;
      }
      
      // Create message entries for this conversation
      if (convo) {
        const messageContents = [
          { sender: 'user', content: `Hi, I need help with ${topic}.` },
          { sender: 'assistant', content: `I'd be happy to help you with ${topic}. What specific aspect are you struggling with?` },
          { sender: 'user', content: `I'm having trouble understanding the core concepts.` },
          { sender: 'assistant', content: `Let me explain the key principles of ${topic} in a simple way...` }
        ];
        
        for (const message of messageContents) {
          await supabase.from('messages').insert({
            conversation_id: convo.id,
            sender: message.sender,
            content: message.content,
            timestamp: timestamp
          });
        }
      }
    }
    
    console.log(`Created mock conversations for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error generating mock conversations:", error);
    return false;
  }
};
