// Exact juz boundaries: each entry is { surah, ayah } where that juz starts
// Juz 1 starts at 1:1, Juz 2 starts at 2:142, etc.
export const JUZ_BOUNDARIES = [
  null, // index 0 unused
  { surah: 1, ayah: 1 },    // Juz 1:  Al-Fatiha 1
  { surah: 2, ayah: 142 },  // Juz 2:  Al-Baqarah 142
  { surah: 2, ayah: 253 },  // Juz 3:  Al-Baqarah 253
  { surah: 3, ayah: 93 },   // Juz 4:  Ali 'Imran 93
  { surah: 4, ayah: 24 },   // Juz 5:  An-Nisa 24
  { surah: 4, ayah: 148 },  // Juz 6:  An-Nisa 148
  { surah: 5, ayah: 83 },   // Juz 7:  Al-Ma'idah 83
  { surah: 6, ayah: 111 },  // Juz 8:  Al-An'am 111
  { surah: 7, ayah: 88 },   // Juz 9:  Al-A'raf 88
  { surah: 8, ayah: 41 },   // Juz 10: Al-Anfal 41
  { surah: 9, ayah: 93 },   // Juz 11: At-Tawbah 93
  { surah: 11, ayah: 6 },   // Juz 12: Hud 6
  { surah: 12, ayah: 53 },  // Juz 13: Yusuf 53
  { surah: 15, ayah: 1 },   // Juz 14: Al-Hijr 1
  { surah: 17, ayah: 1 },   // Juz 15: Al-Isra' 1
  { surah: 18, ayah: 75 },  // Juz 16: Al-Kahf 75
  { surah: 21, ayah: 1 },   // Juz 17: Al-Anbiya' 1
  { surah: 23, ayah: 1 },   // Juz 18: Al-Mu'minun 1
  { surah: 25, ayah: 21 },  // Juz 19: Al-Furqan 21
  { surah: 27, ayah: 56 },  // Juz 20: An-Naml 56
  { surah: 29, ayah: 46 },  // Juz 21: Al-'Ankabut 46
  { surah: 33, ayah: 31 },  // Juz 22: Al-Ahzab 31
  { surah: 36, ayah: 28 },  // Juz 23: Ya-Sin 28
  { surah: 39, ayah: 32 },  // Juz 24: Az-Zumar 32
  { surah: 41, ayah: 47 },  // Juz 25: Fussilat 47
  { surah: 46, ayah: 1 },   // Juz 26: Al-Ahqaf 1
  { surah: 51, ayah: 31 },  // Juz 27: Adh-Dhariyat 31
  { surah: 58, ayah: 1 },   // Juz 28: Al-Mujadilah 1
  { surah: 67, ayah: 1 },   // Juz 29: Al-Mulk 1
  { surah: 78, ayah: 1 },   // Juz 30: An-Naba' 1
];

// Get the juz number for a given surah + ayah
export function getJuz(surahNumber, ayah) {
  for (let j = 30; j >= 1; j--) {
    const b = JUZ_BOUNDARIES[j];
    if (surahNumber > b.surah || (surahNumber === b.surah && ayah >= b.ayah)) {
      return j;
    }
  }
  return 1;
}

// Get the start and end of a juz as { startSurah, startAyah, endSurah, endAyah }
export function getJuzRange(juzNumber) {
  const start = JUZ_BOUNDARIES[juzNumber];
  if (juzNumber === 30) {
    return { startSurah: start.surah, startAyah: start.ayah, endSurah: 114, endAyah: 6 };
  }
  const nextStart = JUZ_BOUNDARIES[juzNumber + 1];
  // End is one ayah before the next juz starts
  const startSurahData = SURAHS.find(s => s.n === nextStart.surah);
  if (nextStart.ayah === 1) {
    // Next juz starts at beginning of a surah, so this juz ends at last ayah of previous surah
    const prevSurah = SURAHS.find(s => s.n === nextStart.surah - 1);
    return { startSurah: start.surah, startAyah: start.ayah, endSurah: prevSurah.n, endAyah: prevSurah.ayahs };
  }
  // Next juz starts mid-surah, so this juz ends at ayah-1 of that surah
  return { startSurah: start.surah, startAyah: start.ayah, endSurah: nextStart.surah, endAyah: nextStart.ayah - 1 };
}

export const SURAHS = [
  {n:1,name:'Al-Fatiha',juz:1,ayahs:7},{n:2,name:'Al-Baqarah',juz:1,ayahs:286},{n:3,name:"Ali 'Imran",juz:3,ayahs:200},
  {n:4,name:'An-Nisa',juz:4,ayahs:176},{n:5,name:"Al-Ma'idah",juz:6,ayahs:120},{n:6,name:"Al-An'am",juz:7,ayahs:165},
  {n:7,name:"Al-A'raf",juz:8,ayahs:206},{n:8,name:'Al-Anfal',juz:9,ayahs:75},{n:9,name:'At-Tawbah',juz:10,ayahs:129},
  {n:10,name:'Yunus',juz:11,ayahs:109},{n:11,name:'Hud',juz:11,ayahs:123},{n:12,name:'Yusuf',juz:12,ayahs:111},
  {n:13,name:"Ar-Ra'd",juz:13,ayahs:43},{n:14,name:'Ibrahim',juz:13,ayahs:52},{n:15,name:'Al-Hijr',juz:14,ayahs:99},
  {n:16,name:'An-Nahl',juz:14,ayahs:128},{n:17,name:"Al-Isra'",juz:15,ayahs:111},{n:18,name:'Al-Kahf',juz:15,ayahs:110},
  {n:19,name:'Maryam',juz:16,ayahs:98},{n:20,name:'Ta-Ha',juz:16,ayahs:135},{n:21,name:"Al-Anbiya'",juz:17,ayahs:112},
  {n:22,name:'Al-Hajj',juz:17,ayahs:78},{n:23,name:"Al-Mu'minun",juz:18,ayahs:118},{n:24,name:'An-Nur',juz:18,ayahs:64},
  {n:25,name:'Al-Furqan',juz:18,ayahs:77},{n:26,name:"Ash-Shu'ara'",juz:19,ayahs:227},{n:27,name:'An-Naml',juz:19,ayahs:93},
  {n:28,name:'Al-Qasas',juz:20,ayahs:88},{n:29,name:"Al-'Ankabut",juz:20,ayahs:69},{n:30,name:'Ar-Rum',juz:21,ayahs:60},
  {n:31,name:'Luqman',juz:21,ayahs:34},{n:32,name:'As-Sajdah',juz:21,ayahs:30},{n:33,name:'Al-Ahzab',juz:21,ayahs:73},
  {n:34,name:"Saba'",juz:22,ayahs:54},{n:35,name:'Fatir',juz:22,ayahs:45},{n:36,name:'Ya-Sin',juz:22,ayahs:83},
  {n:37,name:'As-Saffat',juz:23,ayahs:182},{n:38,name:'Sad',juz:23,ayahs:88},{n:39,name:'Az-Zumar',juz:23,ayahs:75},
  {n:40,name:'Ghafir',juz:24,ayahs:85},{n:41,name:'Fussilat',juz:24,ayahs:54},{n:42,name:'Ash-Shura',juz:25,ayahs:53},
  {n:43,name:'Az-Zukhruf',juz:25,ayahs:89},{n:44,name:'Ad-Dukhan',juz:25,ayahs:59},{n:45,name:'Al-Jathiyah',juz:25,ayahs:37},
  {n:46,name:'Al-Ahqaf',juz:26,ayahs:35},{n:47,name:'Muhammad',juz:26,ayahs:38},{n:48,name:'Al-Fath',juz:26,ayahs:29},
  {n:49,name:'Al-Hujurat',juz:26,ayahs:18},{n:50,name:'Qaf',juz:26,ayahs:45},{n:51,name:'Adh-Dhariyat',juz:26,ayahs:60},
  {n:52,name:'At-Tur',juz:27,ayahs:49},{n:53,name:'An-Najm',juz:27,ayahs:62},{n:54,name:'Al-Qamar',juz:27,ayahs:55},
  {n:55,name:'Ar-Rahman',juz:27,ayahs:78},{n:56,name:"Al-Waqi'ah",juz:27,ayahs:96},{n:57,name:'Al-Hadid',juz:27,ayahs:29},
  {n:58,name:'Al-Mujadilah',juz:28,ayahs:22},{n:59,name:'Al-Hashr',juz:28,ayahs:24},{n:60,name:'Al-Mumtahanah',juz:28,ayahs:13},
  {n:61,name:'As-Saff',juz:28,ayahs:14},{n:62,name:"Al-Jumu'ah",juz:28,ayahs:11},{n:63,name:'Al-Munafiqun',juz:28,ayahs:11},
  {n:64,name:'At-Taghabun',juz:28,ayahs:18},{n:65,name:'At-Talaq',juz:28,ayahs:12},{n:66,name:'At-Tahrim',juz:28,ayahs:12},
  {n:67,name:'Al-Mulk',juz:29,ayahs:30},{n:68,name:'Al-Qalam',juz:29,ayahs:52},{n:69,name:'Al-Haqqah',juz:29,ayahs:52},
  {n:70,name:"Al-Ma'arij",juz:29,ayahs:44},{n:71,name:'Nuh',juz:29,ayahs:28},{n:72,name:'Al-Jinn',juz:29,ayahs:28},
  {n:73,name:'Al-Muzzammil',juz:29,ayahs:20},{n:74,name:'Al-Muddaththir',juz:29,ayahs:56},{n:75,name:'Al-Qiyamah',juz:29,ayahs:40},
  {n:76,name:'Al-Insan',juz:29,ayahs:31},{n:77,name:'Al-Mursalat',juz:29,ayahs:50},{n:78,name:"An-Naba'",juz:30,ayahs:40},
  {n:79,name:"An-Nazi'at",juz:30,ayahs:46},{n:80,name:'Abasa',juz:30,ayahs:42},{n:81,name:'At-Takwir',juz:30,ayahs:29},
  {n:82,name:'Al-Infitar',juz:30,ayahs:19},{n:83,name:'Al-Mutaffifin',juz:30,ayahs:36},{n:84,name:'Al-Inshiqaq',juz:30,ayahs:25},
  {n:85,name:'Al-Buruj',juz:30,ayahs:22},{n:86,name:'At-Tariq',juz:30,ayahs:17},{n:87,name:"Al-A'la",juz:30,ayahs:19},
  {n:88,name:'Al-Ghashiyah',juz:30,ayahs:26},{n:89,name:'Al-Fajr',juz:30,ayahs:30},{n:90,name:'Al-Balad',juz:30,ayahs:20},
  {n:91,name:'Ash-Shams',juz:30,ayahs:15},{n:92,name:'Al-Layl',juz:30,ayahs:21},{n:93,name:'Ad-Duha',juz:30,ayahs:11},
  {n:94,name:'Ash-Sharh',juz:30,ayahs:8},{n:95,name:'At-Tin',juz:30,ayahs:8},{n:96,name:"Al-'Alaq",juz:30,ayahs:19},
  {n:97,name:'Al-Qadr',juz:30,ayahs:5},{n:98,name:'Al-Bayyinah',juz:30,ayahs:8},{n:99,name:'Az-Zalzalah',juz:30,ayahs:8},
  {n:100,name:"Al-'Adiyat",juz:30,ayahs:11},{n:101,name:"Al-Qari'ah",juz:30,ayahs:11},{n:102,name:'At-Takathur',juz:30,ayahs:8},
  {n:103,name:"Al-'Asr",juz:30,ayahs:3},{n:104,name:'Al-Humazah',juz:30,ayahs:9},{n:105,name:'Al-Fil',juz:30,ayahs:5},
  {n:106,name:'Quraysh',juz:30,ayahs:4},{n:107,name:"Al-Ma'un",juz:30,ayahs:7},{n:108,name:'Al-Kawthar',juz:30,ayahs:3},
  {n:109,name:'Al-Kafirun',juz:30,ayahs:6},{n:110,name:'An-Nasr',juz:30,ayahs:3},{n:111,name:'Al-Masad',juz:30,ayahs:5},
  {n:112,name:'Al-Ikhlas',juz:30,ayahs:4},{n:113,name:'Al-Falaq',juz:30,ayahs:5},{n:114,name:'An-Nas',juz:30,ayahs:6}
];
