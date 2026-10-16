import SupportEmailLink from '@/components/SupportEmailLink';

const offerings = [
  ['Competitive Exam Courses', 'fa-book-open'],
  ['Spoken English', 'fa-comments'],
  ['Spoken Hindi', 'fa-language'],
  ['Computer Course', 'fa-desktop'],
  ['Web Development', 'fa-laptop-code'],
  ['Coding', 'fa-code'],
];

export default function AcademyOfferings() {
  return <section aria-labelledby="academy-offerings" className="px-4 py-4">
    <h2 id="academy-offerings" className="text-xs font-bold uppercase text-gray-500">Courses Offered</h2>
    <p className="mt-1 text-xs font-semibold text-purple-700">Online &amp; Offline</p>
    <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
      {offerings.map(([title, icon]) => <li key={title} className="flex min-w-0 items-center gap-2 rounded-lg border border-gray-100 bg-white p-3">
        <i aria-hidden="true" className={`fas ${icon} w-5 shrink-0 text-center text-sm text-purple-600`} />
        <span className="min-w-0 break-words text-xs font-semibold text-gray-800">{title}</span>
      </li>)}
    </ul>
    <SupportEmailLink subject="APEX Academy course enquiry" className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-purple-700 underline underline-offset-4">
      <i aria-hidden="true" className="fas fa-envelope" />Enquire About Courses
    </SupportEmailLink>
  </section>;
}
