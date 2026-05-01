export declare const qaRepository: {
  findQuestionsByLesson(lessonId: string): Promise<
    {
      user: {
        id: string;
        username: string | null;
        displayName: string;
        avatarUrl: string | null;
        level: number;
      };
      id: string;
      createdAt: Date;
      title: string;
      content: string;
      isResolved: boolean;
      answers: {
        user: {
          id: string;
          username: string | null;
          displayName: string;
          avatarUrl: string | null;
          level: number;
        };
        id: string;
        createdAt: Date;
        content: string;
        isAccepted: boolean;
        upvotes: number;
      }[];
      _count: {
        answers: number;
      };
    }[]
  >;
  createQuestion(data: {
    lessonId: string;
    userId: string;
    title: string;
    content: string;
  }): Promise<{
    user: {
      id: string;
      username: string | null;
      displayName: string;
      avatarUrl: string | null;
      level: number;
    };
    id: string;
    createdAt: Date;
    title: string;
    content: string;
    isResolved: boolean;
    _count: {
      answers: number;
    };
  }>;
  createAnswer(data: {
    questionId: string;
    userId: string;
    content: string;
  }): Promise<{
    user: {
      id: string;
      username: string | null;
      displayName: string;
      avatarUrl: string | null;
      level: number;
    };
    id: string;
    createdAt: Date;
    content: string;
    isAccepted: boolean;
    upvotes: number;
  }>;
  findAnswerWithQuestion(answerId: string): Promise<{
    id: string;
    questionId: string;
    question: {
      userId: string;
    };
  } | null>;
  acceptAnswer(answerId: string, questionId: string): Promise<void>;
  incrementUpvotes(answerId: string): Promise<{
    upvotes: number;
  }>;
  findQuestionOwner(questionId: string): Promise<{
    userId: string;
  } | null>;
};
//# sourceMappingURL=qa.repository.d.ts.map
