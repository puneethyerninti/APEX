// Introductory full-course fees selected at the app owner's request; not checkout products.
export const academyOfferings = [
  { id: 'competitive-exams', title: 'Competitive Exam Courses', description: 'Prepare for your next competitive exam.', fee: 4999, image: '/academy/competitive-exams.jpg', alt: 'Student taking notes while studying', category: 'Exam Preparation' },
  { id: 'spoken-english', title: 'Spoken English', description: 'Build confidence in everyday English conversations.', fee: 2999, image: '/academy/spoken-english.jpg', alt: 'Bookshelves in a learning library', category: 'Languages' },
  { id: 'spoken-hindi', title: 'Spoken Hindi', description: 'Develop your Hindi communication skills.', fee: 2499, image: '/academy/spoken-hindi.jpg', alt: 'Students learning together in a library', category: 'Languages' },
  { id: 'computer-course', title: 'Computer Course', description: 'Get comfortable with everyday computer skills.', fee: 3499, image: '/academy/computer-course.jpg', alt: 'Hands demonstrating a task on a laptop', category: 'Digital Skills' },
  { id: 'web-development', title: 'Web Development', description: 'Learn to create websites for the modern web.', fee: 7999, image: '/academy/web-development.jpg', alt: 'Website code open on a laptop', category: 'Technology' },
  { id: 'coding', title: 'Coding', description: 'Build your foundation in programming.', fee: 4999, image: '/academy/coding.jpg', alt: 'Programming code displayed on a computer', category: 'Technology' },
] as const;
