const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/apex';

const JobSchema = new mongoose.Schema({
  title: String,
  company: String,
  location: String,
  type: String,
  salary: String,
  description: String,
  status: { type: String, default: 'active' },
}, { timestamps: true });

const CourseSchema = new mongoose.Schema({
  title: String,
  category: String,
  price: Number,
  description: String,
  thumbnailUrl: String,
  instructor: String,
  status: { type: String, default: 'active' },
}, { timestamps: true });

const Job = mongoose.model('Job', JobSchema);
const Course = mongoose.model('Course', CourseSchema);

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  await Job.deleteMany({ type: { $ne: 'Application' }});
  await Course.deleteMany({});

  await Job.create([
    { title: 'Senior React Dev', company: 'Google', location: 'Bangalore', type: 'Full-Time', salary: '₹35L - 50L / yr', description: 'React expert needed.' },
    { title: 'Product Designer', company: 'Microsoft', location: 'Hyderabad', type: 'Hybrid', salary: '₹25L - 40L / yr', description: 'Design UI.' },
  ]);

  await Course.create([
    { title: 'Spoken English', category: 'Languages', price: 4999, description: 'Fluency & Grammar', thumbnailUrl: '' },
    { title: 'Spoken Hindi', category: 'Languages', price: 3999, description: 'Conversational Skills', thumbnailUrl: '' },
    { title: 'Full-Stack Web Development', category: 'Technology', price: 9999, description: 'MERN Stack Masterclass', thumbnailUrl: '' },
  ]);

  console.log('Seeded jobs and courses');
  process.exit(0);
}

seed();
