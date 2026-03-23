const blogArticles = [
  {
    slug: 'why-i-built-e-daarah',
    title: 'We Had No Way to Track if Students Were Actually Showing Up',
    description:
      'I taught at two madrasahs in New Zealand. At both, attendance was a sheet of paper that got lost by end of term. I built E-Daarah because I got tired of it.',
    date: '2026-03-20',
    readTime: '3 min read',
    category: 'Story',
    sections: [
      {
        body: 'I taught at two different madrasahs — one in Palmerston North, one in Tauranga. Both were run by good people who cared about the students. And at both, the system for tracking anything was the same: sheets of paper.\n\nThe admin would hand out attendance sheets at the start of each term. We\'d mark them during class. Sometimes. Other times I\'d forget. Or I\'d mark them at the end of class from memory, which is basically guessing. Some teachers were consistent. Some weren\'t. The admin had no way of knowing who was actually doing it and who wasn\'t.'
      },
      {
        heading: 'End of term was the worst part',
        body: 'When it came time to put together student records — attendance, conduct, punctuality — we\'d scramble. Sheets would be missing. Someone\'s handwriting was unreadable. A whole month of records from one class just wasn\'t there because the teacher forgot or lost the paper.\n\nWe couldn\'t reproduce a student\'s record. Not properly. If someone asked "how many times did this student attend this term?" the honest answer was often "we\'re not sure."\n\nConduct grades? Same problem. Punctuality? Nobody was tracking it in any real way. We knew the students who were always late, but we had nothing written down.'
      },
      {
        heading: 'This is 2026',
        body: 'I kept thinking — we\'re all walking around with phones in our pockets. Why is attendance still a piece of paper that gets shoved in a folder and lost?\n\nSo I started building something. Not a big enterprise system. Just a simple app where a teacher opens their phone, taps a few names, and attendance is recorded. Where the admin can actually see which classes have been marked and which haven\'t. Where at the end of the term, the data is just there — no scrambling, no missing sheets.\n\nThat\'s how E-Daarah started. It\'s still simple. It runs on your phone. And it solves the problem I lived with for years: madrasahs that care about their students but can\'t keep track of the basics because the tools don\'t exist.'
      }
    ]
  },
  {
    slug: 'why-quran-tracking-is-free',
    title: 'Why We Made Qur\'an Tracking Free',
    description:
      'We could have charged for it. Here\'s why we didn\'t.',
    date: '2026-03-15',
    readTime: '2 min read',
    category: 'Product',
    sections: [
      {
        body: 'When we were deciding what to include in E-Daarah\'s free plan, Qur\'an tracking was the obvious choice.\n\nNot because it\'s a small feature. It\'s actually one of the most complex parts of the app — tracking hifdh, tilawah, and muraja\'ah separately for each student, remembering positions across sessions, showing progress over time. It took real effort to build.'
      },
      {
        heading: 'The reason is simple',
        body: 'Qur\'an education is the one thing every madrasah has in common. Whether you\'re a weekend school in London with 15 students, a daily hifdh program in Lahore with 200, or a single teacher running classes from a mosque in Lagos — you\'re teaching Qur\'an.\n\nAnd almost everyone is tracking it the same way: pencil marks in a mushaf, a notebook, or just memory. It\'s the part of madrasah management that has the least tooling and the most need.\n\nCharging for it would mean the teachers who need it most — the ones running small, volunteer-driven programs with no budget — couldn\'t use it. That didn\'t sit right with us.'
      },
      {
        heading: 'What free gets you',
        body: 'With E-Daarah\'s free plan, you can track up to 75 students. For each one, you can record hifdh, tilawah, and revision sessions — the surah, ayah range, grade, and whether they passed or need to repeat. The app remembers where they left off so you don\'t have to.\n\nNo trial period. No expiry. No credit card.\n\nIf your madrasah grows and you want attendance tracking, parent reports, SMS reminders, and fee management — those are on our paid plans, starting from $2/month depending on your region. But the Qur\'an tracking is yours to keep.'
      }
    ]
  },
  {
    slug: 'why-we-charge-two-dollars',
    title: 'We Charge $2/Month in Some Countries. Here\'s Why.',
    description:
      'A madrasah in Lagos and a madrasah in London don\'t have the same budget. Our pricing reflects that.',
    date: '2026-03-10',
    readTime: '2 min read',
    category: 'Pricing',
    sections: [
      {
        body: 'When we launched E-Daarah, our plans were priced in US dollars. $5 for Solo, $12 for Standard, $29 for Plus. Fair pricing for New Zealand, Australia, the US, the UK.\n\nBut then we started getting interest from Nigeria, Pakistan, Bangladesh, India, Indonesia. And $12/month for a weekend madrasah run by volunteers in Kano? That\'s not reasonable. That\'s more than some teachers there earn in a day.'
      },
      {
        heading: 'Same app, different price',
        body: 'So we built regional pricing. The app is identical everywhere — same features, same support, same updates. But the price adjusts based on where you are.\n\nIn tier 2 countries, the Standard plan is $4/month instead of $12. In tier 3 countries — parts of Africa, South Asia, Southeast Asia — it\'s $2/month.\n\nWe detect your region automatically. No coupon codes, no applying for a discount. You just see the price that makes sense for your economy.'
      },
      {
        heading: 'Why not just make it free?',
        body: 'We thought about it. But free products don\'t survive. Servers cost money. SMS messages cost money. Development costs money. If E-Daarah is going to be around in 5 years — which is what madrasahs need, a tool they can rely on — it needs to sustain itself.\n\n$2/month keeps the lights on while keeping the door open for schools that would otherwise be priced out. It\'s not charity. It\'s just common sense.'
      }
    ]
  },
  {
    slug: 'whatsapp-is-not-school-management',
    title: 'The WhatsApp Group Is Not a School Management System',
    description:
      'Your madrasah WhatsApp group has 47 unread messages. None of them tell you if Ahmad attended last week.',
    date: '2026-03-05',
    readTime: '2 min read',
    category: 'Opinion',
    sections: [
      {
        body: 'Every madrasah I know has a WhatsApp group. Usually more than one. There\'s one for the teachers. One for parents. Sometimes one per class. Sometimes one "admin only" group that somehow has 30 people in it.\n\nAnd they all do the same thing: general announcements, reminders about class times, the occasional photo from an event, and a lot of "JazakAllahu khairan" messages.\n\nWhat they don\'t do is tell you anything useful about how the madrasah is actually running.'
      },
      {
        heading: 'What you can\'t do in a group chat',
        body: 'You can\'t see which students attended this week and which didn\'t. You can\'t check if a student\'s attendance has been dropping over the last month. You can\'t look up where a student is in their Qur\'an memorisation. You can\'t see who has paid fees and who hasn\'t.\n\nYou can scroll through 200 messages looking for that one time someone mentioned it. But that\'s not a system. That\'s archaeology.\n\nThe problem isn\'t WhatsApp itself. It\'s good for what it is — quick communication. The problem is when it becomes the only tool, and people start treating it like a database.'
      },
      {
        heading: 'Use WhatsApp for chat. Use a system for data.',
        body: 'Keep your WhatsApp groups. They\'re fine for announcements and coordination. But the data that matters — attendance, progress, conduct, fees — needs to live somewhere structured. Somewhere you can search it, filter it, and pull up a student\'s full record in seconds.\n\nThat\'s what apps like E-Daarah are for. Not to replace your WhatsApp group. To replace the parts of your WhatsApp group that were never supposed to be WhatsApp\'s job.'
      }
    ]
  },
  {
    slug: 'school-software-not-built-for-madrasahs',
    title: 'Most School Software Isn\'t Built for Madrasahs. We\'re Changing That.',
    description:
      'School management software exists. But try finding one that tracks hifdh progress or knows what a semester means in a weekend madrasah.',
    date: '2026-02-25',
    readTime: '2 min read',
    category: 'Product',
    sections: [
      {
        body: 'There are hundreds of school management apps out there. ClassDojo, Alma, Gradelink, you name it. They work well for what they\'re designed for: full-time secular schools with standard grade levels, standardised curricula, and full-time admin staff.\n\nNow try using one to track a student\'s hifdh progress through Surah Al-Baqarah. Or to manage a madrasah that only runs on Saturdays. Or to send fee reminders in a country where $12/month is half a teacher\'s salary.\n\nYou can\'t. Because they weren\'t built for this.'
      },
      {
        heading: 'What makes madrasahs different',
        body: 'Madrasahs have specific needs that generic school software ignores:\n\n— Qur\'an tracking is a core feature, not an afterthought. Teachers need to log hifdh, tilawah, and revision by surah and ayah, track where each student left off, and show progress over time.\n— Many madrasahs run part-time — weekends, evenings, a few hours a week. The software needs to understand that a "term" might mean 20 Saturdays, not 180 school days.\n— Conduct grading includes things like dressing and punctuality, not just academic behaviour.\n— Budgets are tiny. Most madrasahs are community-funded or charity-run. Enterprise pricing is out of the question.\n— Teachers use phones, not laptops. The app needs to work on a phone or it won\'t get used.'
      },
      {
        heading: 'Built from the inside',
        body: 'E-Daarah was built by someone who taught in madrasahs. Not by a software company that surveyed some schools and added an "Islamic school" checkbox to their product.\n\nThat\'s why Qur\'an tracking is a first-class feature. That\'s why the free plan exists. That\'s why the whole thing works on a phone. And that\'s why it costs $2/month in countries where $12 would be absurd.\n\nMadrasahs deserve tools that were actually designed for them.'
      }
    ]
  },
  {
    slug: 'what-i-wish-my-admin-had',
    title: 'What I Wish My Madrasah Admin Had When I Was Teaching',
    description:
      'I was one of those teachers who forgot to mark attendance. Here\'s what would have made the difference.',
    date: '2026-02-15',
    readTime: '2 min read',
    category: 'Teaching',
    sections: [
      {
        body: 'I\'ll be honest — I wasn\'t always great at marking attendance. I\'d get to class, start teaching, and by the end I\'d fill in the sheet from memory. Or I\'d forget entirely. The paper would sit in my bag for a week and then I\'d mark three sessions at once, guessing who was there.\n\nI wasn\'t being careless. I just had 25 students in front of me, limited time, and a piece of paper that didn\'t feel urgent. Teaching felt urgent. The paper could wait. Except it couldn\'t, because by the time someone needed that data, it was gone.'
      },
      {
        heading: 'What the admin couldn\'t see',
        body: 'Our admin was doing their best. But they had no visibility into what was happening in each class. They didn\'t know which teachers were marking attendance consistently and which weren\'t. They couldn\'t tell if a student\'s attendance was dropping without manually checking stacks of paper — which nobody had time to do.\n\nAt the end of the term, they\'d ask for records and get a mix of complete sheets, half-filled sheets, and blank apologies. Putting together a student report was guesswork.'
      },
      {
        heading: 'What would have helped',
        body: 'If my admin had a dashboard that showed, in real time, which classes had been marked today and which hadn\'t — that alone would have changed things. A gentle nudge. "You haven\'t marked attendance for Junior Boys today." That\'s it.\n\nAnd for me as a teacher, if marking attendance was three taps on my phone instead of finding a pen and filling in a grid — I would have done it every single time. Not because I suddenly became more disciplined, but because the barrier dropped from five minutes to ten seconds.\n\nThat\'s the thing about systems. Good ones don\'t rely on people being perfect. They make the right behaviour the easy behaviour. That\'s what I tried to build with E-Daarah.'
      }
    ]
  },
  {
    slug: 'how-to-digitise-your-madrasah',
    title: 'How to Digitise Your Madrasah — A Practical Guide',
    description:
      'You don\'t need a big budget or an IT team. Here\'s how to move your madrasah from paper and WhatsApp to something that actually works.',
    date: '2026-02-05',
    readTime: '4 min read',
    category: 'Guide',
    sections: [
      {
        body: 'Most madrasahs run on three things: paper, WhatsApp, and memory. And honestly, it works — for a while. Until a teacher loses an attendance sheet. Until you can\'t remember who paid fees last month. Until a parent asks how their child is doing and nobody has a clear answer.\n\nDigitising doesn\'t mean buying expensive software or hiring an IT person. It means replacing the parts of your system that keep failing with something more reliable. Here\'s how to do it, step by step, without overcomplicating things.'
      },
      {
        heading: 'Start with attendance',
        body: 'Attendance is the easiest win because you\'re already doing it — just unreliably. The goal is to move from a sheet of paper that gets lost to something a teacher can do on their phone in 10 seconds.\n\nYou have options. Google Forms works if you set up a form per class. A shared Google Sheet can work too. Some madrasahs use ClassDojo or even just a WhatsApp message to a dedicated group ("Marked — 18 present, 3 absent").\n\nThese all work better than paper. But they share a problem: the admin still has no real-time view of what\'s happening. You find out a teacher didn\'t mark attendance three weeks later when you check the spreadsheet. By then the data is gone.\n\nWhat you really want is something that shows the admin, today, which classes have been marked and which haven\'t. That kind of visibility changes teacher behaviour without anyone having to nag.'
      },
      {
        heading: 'Qur\'an tracking is where generic tools break down',
        body: 'You can track attendance in a spreadsheet. You can track fees in a spreadsheet. But try tracking a student\'s hifdh progress through Surah Al-Baqarah in Google Sheets and you\'ll see the problem.\n\nQur\'an progress isn\'t a single number. It\'s a position — surah, ayah, whether they passed or need to repeat, whether this was hifdh or tilawah or revision. It changes every session. And the next session needs to pick up exactly where the last one left off.\n\nSome teachers use pencil marks in the student\'s mushaf. Some use a personal notebook. Some just remember. All of these break when the teacher is absent, when a new teacher takes over, or when a parent asks for a progress update.\n\nThere isn\'t really a generic tool that handles this well. It\'s too specific. You need something that was built for Qur\'an education specifically — something that knows what a surah is, what juz means, and how hifdh tracking actually works in practice.'
      },
      {
        heading: 'Fees: the spreadsheet works until it doesn\'t',
        body: 'For a madrasah with 20 students, a shared spreadsheet for fee tracking is fine. Log who paid, how much, when. Simple.\n\nBut as you grow, two things happen. First, you lose track. The spreadsheet gets messy, someone forgets to update it, and suddenly you\'re not sure if a family paid in February or not. Second, you still have to chase payments manually — sending WhatsApp messages, pulling parents aside, having the awkward conversation.\n\nWhat helps is a system where the parent can see their own balance, and where reminders go out automatically. Not because you\'re being aggressive about money — but because most parents genuinely just forget, and a simple SMS before the due date solves it.'
      },
      {
        heading: 'Parent communication: beyond the WhatsApp group',
        body: 'WhatsApp is great for announcements. "No class this Saturday." "Exam schedule attached." That\'s fine.\n\nBut WhatsApp can\'t give a parent a clear picture of their child\'s attendance over the term. It can\'t show them where their child is in Qur\'an memorisation. It can\'t tell them their fee balance. For that, you need something structured — a parent portal or a report that pulls from actual data.\n\nParents who feel informed stay engaged. Parents who have to chase the teacher for updates eventually stop asking.'
      },
      {
        heading: 'The real problem with stitching tools together',
        body: 'You can technically digitise a madrasah with Google Sheets for attendance, a notebook app for Qur\'an tracking, a spreadsheet for fees, and WhatsApp for everything else. Some madrasahs do exactly this.\n\nBut nothing talks to each other. You can\'t pull up a student\'s full record — attendance, Qur\'an progress, fees, conduct — in one place. End of term, you\'re still opening four different apps and copy-pasting into a report.\n\nThe more tools you stitch together, the more likely one of them breaks — someone stops updating the spreadsheet, the Google Form link changes, a teacher uses the wrong WhatsApp group. The system only works when every person follows every step perfectly. And in a volunteer-run madrasah, that doesn\'t happen.'
      },
      {
        heading: 'Or use something built for this',
        body: 'This is why we built E-Daarah. Not because spreadsheets are bad — they\'re just not designed for this. E-Daarah puts attendance, Qur\'an tracking, fees, conduct, and parent reports in one app that works on a phone.\n\nQur\'an tracking is free — up to 75 students, no credit card, no expiry. If you want attendance, fees, SMS reminders, and parent reports, paid plans start from $2/month depending on your region.\n\nYou don\'t have to switch everything at once. Start with Qur\'an tracking or attendance. Use it for a term. Add more when you\'re ready. The point isn\'t to go digital overnight — it\'s to stop losing data that matters.'
      }
    ]
  }
];

export default blogArticles;
