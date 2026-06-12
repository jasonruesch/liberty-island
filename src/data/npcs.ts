// The ferry cohort: travelers from around the world, each with a distinct
// look (a respectful mix of traditional garments and modern clothes with
// cultural touches) and their own excited voice.

export type OutfitKind =
  | 'casual'
  | 'sari'
  | 'kurta'
  | 'kimono'
  | 'ankara'
  | 'kente'
  | 'huipil'
  | 'charro'
  | 'hiking'
  | 'kaftan'
  | 'keffiyeh'
  | 'qipao'
  | 'breton'
  | 'jersey'
  | 'marius'
  | 'kilt'
  | 'hanbok'
  | 'vyshyvanka'
  | 'dashiki'
  | 'flamenco'

export interface NpcDef {
  id: string
  name: string
  home: string
  flag: string
  skin: number
  hair: number
  outfit: OutfitKind
  c1: number // primary outfit color
  c2: number // secondary
  c3?: number // accent
  hat?: 'cap' | 'beret' | 'sombrero' | 'gele' | 'hijab' | 'bucket' | 'sunhat' | 'turban' | 'visor' | 'none'
  glasses?: boolean
  hasCamera?: boolean
  lines: {
    ferry: string[]
    island: string[]
    chat: string[]
  }
}

export const NPC_DEFS: NpcDef[] = [
  {
    id: 'kenji', name: 'Kenji', home: 'Osaka, Japan', flag: '🇯🇵', skin: 0xf3c89e, hair: 0x2a2a30,
    outfit: 'casual', c1: 0x6b7f99, c2: 0x39424e, hat: 'bucket', hasCamera: true,
    lines: {
      ferry: ['Look at her! Even bigger than in my photo books!', 'I charged three camera batteries for today.'],
      island: ['The patina is this beautiful sea-green up close. Incredible.', 'I am going to photograph her from all eleven star points!'],
      chat: ['My grandfather kept a postcard of this statue on his desk for fifty years. Today I mail him a new one.', 'In Osaka we have a small Statue of Liberty replica — but THIS… this is the real one!'],
    },
  },
  {
    id: 'yuki', name: 'Yuki', home: 'Kyoto, Japan', flag: '🇯🇵', skin: 0xf6d2ac, hair: 0x1f1f26,
    outfit: 'kimono', c1: 0xe8b7c8, c2: 0xc46a8a, c3: 0xf6f0e6,
    lines: {
      ferry: ['The harbor wind! Hold onto your hats, everyone!', 'I wore my spring kimono — Lady Liberty wears a robe too, we match!'],
      island: ['The cherry trees at home are blooming now. New York spring feels different — saltier!', 'I will fold a paper crane and leave nothing but good wishes.'],
      chat: ['Bartholdi sculpted her face so calm. Like a temple statue — strong and serene at once.', 'My travel journal has 40 pages just for today.'],
    },
  },
  {
    id: 'priya', name: 'Priya', home: 'Jaipur, India', flag: '🇮🇳', skin: 0xb97f56, hair: 0x17131a,
    outfit: 'sari', c1: 0x2a9d8f, c2: 0xe9c46a,
    lines: {
      ferry: ['I taught a whole unit on this statue to my students. Now I get to SEE it!', 'The torch is covered in real gold leaf, did you know?'],
      island: ['153 steps to her crown… in a sari! Watch me.', 'The tablet reads July 4th, 1776 — in Roman numerals!'],
      chat: ['I am a history teacher. My students made me promise to take one hundred photos. I will take three hundred.', 'France gave her as a gift of friendship. Imagine — a gift, this size!'],
    },
  },
  {
    id: 'arjun', name: 'Arjun', home: 'Mumbai, India', flag: '🇮🇳', skin: 0xa9744e, hair: 0x221a18,
    outfit: 'kurta', c1: 0xdd6b4d, c2: 0xf4ebdc,
    lines: {
      ferry: ['The skyline! Mumbai has towers, but this harbor — wah!', 'My cousin said the crown line sells out. We have CROWN TICKETS!'],
      island: ['Bollywood filmed here twice, I am sure of it.', 'I want a foam crown. Maybe two foam crowns.'],
      chat: ['My startup runs on three time zones, but today my phone is OFF. Just me and the lady with the torch.', 'The ferry from Mumbai harbor smells the same. The sea connects everything, na?'],
    },
  },
  {
    id: 'amara', name: 'Amara', home: 'Lagos, Nigeria', flag: '🇳🇬', skin: 0x6b4128, hair: 0x141014,
    outfit: 'ankara', c1: 0x2d7dd2, c2: 0xf2b134, c3: 0xe04848, hat: 'gele',
    lines: {
      ferry: ['This breeze is doing wonders for my gele. Photo time!', 'They say she walks forward — see her heel lifted? Always moving!'],
      island: ['Lagos to New York, fourteen hours. Worth every minute.', 'The museum keeps her first torch. The ORIGINAL fire!'],
      chat: ['I design fabric back home. Her robe folds? Excellent drape. Bartholdi knew textiles.', 'My sister video-called me at the gate: "Bring me the snow globe!" I will bring two.'],
    },
  },
  {
    id: 'kwame', name: 'Kwame', home: 'Accra, Ghana', flag: '🇬🇭', skin: 0x7a4a2d, hair: 0x111014,
    outfit: 'kente', c1: 0xe8a013, c2: 0x167d45, c3: 0xc8102e,
    lines: {
      ferry: ['Broken chains at her feet. My grandmother told me about those. I came to see them myself.', 'The harbor is bigger than I imagined!'],
      island: ['This kente cloth was woven by my uncle. It travels with me everywhere important.', 'Freedom looks good in copper green.'],
      chat: ['At her feet lie broken shackles — most people never look. Today I looked. It means something to stand here.', 'Accra, London, New York. Three harbors, one sky.'],
    },
  },
  {
    id: 'sofia', name: 'Sofía', home: 'Oaxaca, Mexico', flag: '🇲🇽', skin: 0xcd9268, hair: 0x261c18,
    outfit: 'huipil', c1: 0xf6f0e6, c2: 0xd23b56, c3: 0x2a9d8f,
    lines: {
      ferry: ['¡Mira! She is greeting the ships, just like the songs say.', 'My abuela embroidered this blouse. She said: wear it somewhere unforgettable.'],
      island: ['The flowers here bloom in April too, like at home.', 'I will buy postcards — one for every cousin. I have many cousins!'],
      chat: ['My great-uncle passed this statue on a ship in 1923. He wrote one line in his diary: "She held the light for me."', 'Oaxaca to New York is far, but a promise to my abuela is further.'],
    },
  },
  {
    id: 'diego', name: 'Diego', home: 'Guadalajara, Mexico', flag: '🇲🇽', skin: 0xc08458, hair: 0x1d1715,
    outfit: 'charro', c1: 0x3a3f52, c2: 0xc9a227, hat: 'sombrero',
    lines: {
      ferry: ['The hat? The hat stays ON for the photo, amigo.', '¡Qué chula la bahía! What a harbor!'],
      island: ['I mariachi at weddings. Today I sing only for the seagulls.', 'Where is this famous Beast Burger I read about?'],
      chat: ['I brought my father\'s sombrero. He always said he would visit her one day. So — WE are visiting.', 'Music and liberty, my friend. The two things that need no translation.'],
    },
  },
  {
    id: 'hans', name: 'Hans', home: 'Munich, Germany', flag: '🇩🇪', skin: 0xf3c89e, hair: 0xb98a4a,
    outfit: 'hiking', c1: 0x5b7553, c2: 0xc9c2b0, glasses: true,
    lines: {
      ferry: ['According to my guidebook we arrive in exactly four minutes. I am SO punctual-excited.', 'The statue is 46 meters. The pedestal, 47. I memorized the schematics!'],
      island: ['I have walked the Alps, but these 354 steps to the crown? A worthy summit.', 'Socks and sandals are PRACTICAL, thank you for asking.'],
      chat: ['I am an engineer. Gustave Eiffel built her skeleton — the same Eiffel! The tower man! Inside her is a masterpiece.', 'I planned this trip for two years. The spreadsheet has 14 tabs.'],
    },
  },
  {
    id: 'greta', name: 'Greta', home: 'Stockholm, Sweden', flag: '🇸🇪', skin: 0xf6d8b8, hair: 0xe8d28a,
    outfit: 'casual', c1: 0xf2c14e, c2: 0x3e5c76,
    lines: {
      ferry: ['Cloudy and bright — perfect photo light. Trust a Swede about clouds.', 'The water is so calm today. Skål, New York!'],
      island: ['We sailed past Ellis Island! My great-great-grandmother came through there in 1903.', 'Fika time. I hear the café has cinnamon… something. Close enough.'],
      chat: ['My family name was changed at Ellis Island, two letters shorter. Today I bring all my letters back to say hello.', 'Stockholm has 14 islands. New York understands island life!'],
    },
  },
  {
    id: 'fatima', name: 'Fatima', home: 'Marrakesh, Morocco', flag: '🇲🇦', skin: 0xc08458, hair: 0x1a1414,
    outfit: 'kaftan', c1: 0x7d5ba6, c2: 0xd9a521, hat: 'hijab',
    lines: {
      ferry: ['The light on the water — like the fountains of the Menara gardens, but endless.', 'Seven rays on her crown. Seven seas. I crossed one to be here!'],
      island: ['My kaftan was made for celebrations. Today qualifies, yes?', 'I promised my daughters a video from the very top.'],
      chat: ['In Marrakesh our medina is a thousand years old. Your statue is young — not even 150! A baby. A very tall baby.', 'Mint tea after this. The café will not have proper mint tea, but I forgive them in advance.'],
    },
  },
  {
    id: 'omar', name: 'Omar', home: 'Cairo, Egypt', flag: '🇪🇬', skin: 0xb98a5e, hair: 0x191414,
    outfit: 'casual', c1: 0xe3dcca, c2: 0x2f3640, hat: 'none', glasses: true,
    lines: {
      ferry: ['Did you know Bartholdi first offered a colossus to Egypt? For the Suez Canal! We said not now — and look what New York got!', 'The harbor reminds me of Alexandria. Bigger ships, same gulls.'],
      island: ['An Egyptian engineer appreciates a good colossus. We practically invented them.', 'I will compare her to the pyramids. Professionally.'],
      chat: ['Her first name was "Egypt Carrying the Light to Asia" — Bartholdi\'s first sketch was for MY country. So she is a little bit Egyptian. I claim her.', 'The Nile, the Hudson — rivers carry civilizations. And tourists. Mostly tourists.'],
    },
  },
  {
    id: 'mei', name: 'Mei', home: 'Shanghai, China', flag: '🇨🇳', skin: 0xf6d2ac, hair: 0x16161c,
    outfit: 'qipao', c1: 0xc4304b, c2: 0xe9b64f,
    lines: {
      ferry: ['Shanghai has taller towers, but nothing that FACES the sea like she does.', 'My qipao is silk. The wind loves it too much!'],
      island: ['I livestreamed the arrival. Six hundred people watched the fog with me.', 'The spring magnolias at home would love this island.'],
      chat: ['I studied art history. Her face is neoclassical but her meaning is modern — that tension is why she works.', 'My grandmother saw her in a movie in 1980 and said "someday, someone from this family." So — here I am, nǎinai.'],
    },
  },
  {
    id: 'liwei', name: 'Li Wei', home: 'Beijing, China', flag: '🇨🇳', skin: 0xf0c9a0, hair: 0x101014,
    outfit: 'casual', c1: 0x3d8361, c2: 0xe8e4d8, hat: 'cap', hasCamera: true,
    lines: {
      ferry: ['My drone stays in the bag — rules are rules — but my zoom lens is READY.', 'The Great Wall took centuries. This took nine years. Both: worth it.'],
      island: ['I plan to find the exact postcard angle. The one EVERYONE takes. Then take it better.', 'Crown tickets! I booked them four months ago at 3 a.m.'],
      chat: ['Photography tip: cloudy days are a giant softbox. Today the whole sky works for us.', 'I cycled 40 countries. The last photo of every trip is always a statue. This one is the BIG one.'],
    },
  },
  {
    id: 'aoife', name: 'Aoife', home: 'Galway, Ireland', flag: '🇮🇪', skin: 0xf6ddc4, hair: 0xb5502d,
    outfit: 'casual', c1: 0x2e6e4e, c2: 0xe8e4d8,
    lines: {
      ferry: ['Half of Galway came through this harbor once. I can nearly hear them.', 'Grand soft day for it! The clouds came with me from Ireland, sorry about that.'],
      island: ['I\'m finding the Irish names in the museum. There will be HUNDREDS.', 'A million of us sailed past her with everything in one suitcase.'],
      chat: ['My great-granda arrived in 1921 with a fiddle and four shillings. The fiddle is still in our kitchen. I came to say thanks for letting him in.', 'The craic on this ferry is ninety. Is that a New York seagull or is he Irish too?'],
    },
  },
  {
    id: 'lorenzo', name: 'Lorenzo', home: 'Florence, Italy', flag: '🇮🇹', skin: 0xe7b88a, hair: 0x33241c,
    outfit: 'casual', c1: 0x8c93a8, c2: 0x2c2f3a, glasses: true,
    lines: {
      ferry: ['As a Florentine I am professionally obligated to judge all statues. Verdict: magnifica.', 'The scarf? Cashmere. The harbor wind respects quality.'],
      island: ['Michelangelo would have liked her. Strong jaw. Good drapery.', 'Espresso first. Then culture. This is the correct order.'],
      chat: ['We Italians arrived here by the million — my own nonno among them, 1948, with a recipe book. New York pizza? A loving grandchild of ours.', 'Her copper is two pennies thick. TWO PENNIES! And she has stood for 140 years. That, my friend, is craftsmanship.'],
    },
  },
  {
    id: 'chloe', name: 'Chloé', home: 'Paris, France', flag: '🇫🇷', skin: 0xf3cba6, hair: 0x4a3326,
    outfit: 'breton', c1: 0xf6f0e6, c2: 0x2e4a66, hat: 'beret',
    lines: {
      ferry: ['She is FRENCH, you know. We built her in Paris — she sailed in 350 pieces!', 'Bonjour, Madame la Liberté! Your little sister on the Seine sends love!'],
      island: ['Bartholdi gave her my great-city\'s heart. I came to check she is being treated well.', 'A beret in the wind is a commitment. I am committed.'],
      chat: ['In Paris we have four little Liberties. This is the eldest sister — la grande dame. Family visit!', 'Eiffel built her bones before his tower. She was his rehearsal. Do not tell the tower.'],
    },
  },
  {
    id: 'isabela', name: 'Isabela', home: 'Rio de Janeiro, Brazil', flag: '🇧🇷', skin: 0xc98e62, hair: 0x241a16,
    outfit: 'jersey', c1: 0xf2c14e, c2: 0x2a9d4f,
    lines: {
      ferry: ['Rio has Cristo on a mountain. New York has a lady in the sea. Both with open arms!', 'GOOOOAL — sorry, force of habit. ARRIVAL!'],
      island: ['Carnival taught me: if you wear it boldly, it is fashion. Foam crown please!', 'The gulls here are bold like Copacabana pigeons. Guard your fries!'],
      chat: ['Statues that welcome — my city and yours both understood. Open arms work in any language.', 'I sambaed at the airport when tickets were confirmed. Security was confused but supportive.'],
    },
  },
  {
    id: 'sven', name: 'Sven', home: 'Bergen, Norway', flag: '🇳🇴', skin: 0xf3d6b6, hair: 0xd9b96a,
    outfit: 'marius', c1: 0x3e5c76, c2: 0xf6f0e6, c3: 0xc4484a,
    lines: {
      ferry: ['In Bergen it rains 240 days a year. This cloudy sky feels like a warm hug from home.', 'A fine vessel. I have opinions about ferries. Good ones, today.'],
      island: ['My sweater is hand-knitted Marius pattern. Warmer than it looks. Wetter than it should be.', 'Vikings sailed worse seas for worse views.'],
      chat: ['My great-aunt left a fjord for Brooklyn in 1925. She wrote home: "The lady with the torch nodded at me." We still tell that story.', 'I fish for a living. The gulls here? Amateurs. Bergen gulls would take the whole tray.'],
    },
  },
  {
    id: 'anong', name: 'Anong', home: 'Chiang Mai, Thailand', flag: '🇹🇭', skin: 0xd9a878, hair: 0x1c1418,
    outfit: 'casual', c1: 0xc46a8a, c2: 0x7d5ba6, hat: 'sunhat',
    lines: {
      ferry: ['The harbor smells like adventure. And a little like diesel. Mostly adventure!', 'In Thailand we wai to greet. I will wai the statue. She has earned it.'],
      island: ['Our temples have golden spires; her torch is gold too. Sacred things shine, I think.', 'Street food rule: eat where the birds gather. The birds gather EVERYWHERE here.'],
      chat: ['I sell flowers at the night market. I brought jasmine seeds in my heart — no, not in my bag, customs officer, just my heart!', 'Songkran is next week at home. If you see me splash harbor water, it is cultural, I promise.'],
    },
  },
  {
    id: 'minjun', name: 'Min-jun', home: 'Seoul, South Korea', flag: '🇰🇷', skin: 0xf3cda6, hair: 0x14141c,
    outfit: 'casual', c1: 0x222831, c2: 0xe8e4d8, hat: 'cap', hasCamera: true,
    lines: {
      ferry: ['Vlog intro, take five: "Annyeong! Today… LIBERTY ISLAND!" …Take six.', 'Seoul has hills, rivers, towers — but no sea-statue. Noted, city hall.'],
      island: ['My followers voted: 73% said climb the crown. Democracy says my legs must suffer.', 'The lighting today is literally cinematic. No color grade needed.'],
      chat: ['I edit videos for a living, but some things you keep off-camera. The first sight of her from the rail — that one is just mine.', 'BTS filmed in New York and now me. We are basically colleagues.'],
    },
  },
  {
    id: 'callum', name: 'Callum', home: 'Inverness, Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', skin: 0xf3d6ba, hair: 0x8a3d22,
    outfit: 'kilt', c1: 0x2e4a66, c2: 0x2e6e4e, c3: 0xc4484a,
    lines: {
      ferry: ['A kilt in harbor wind is a tactical decision, and I stand by it.', 'Nessie is shy. Your lady here? Not shy. I respect that.'],
      island: ['Andrew Carnegie sailed past her too — Dunfermline lad. We Scots got everywhere.', 'They say the café does chowder. We shall see how it compares to cullen skink.'],
      chat: ['My clan scattered to four continents. Half came through THIS harbor. The tartan remembers.', 'Bagpipes were considered for this trip. My wife exercised veto power. The marriage survives.'],
    },
  },
  {
    id: 'rosa', name: 'Rosa', home: 'San Antonio, Texas, USA', flag: '🇺🇸', skin: 0xd9a878, hair: 0x6b6b70,
    outfit: 'casual', c1: 0xe9806e, c2: 0xf6f0e6, hat: 'visor',
    lines: {
      ferry: ['Sixty-eight years old and FIRST time seeing her. Don\'t y\'all wait like I did!', 'I brought snacks for everybody. Grandma rules apply at sea.'],
      island: ['My fanny pack has sunscreen, bandaids, and emergency cookies. I am PREPARED.', 'Lord, she\'s taller than the Alamo is wide.'],
      chat: ['Raised five kids, taught fourth grade thirty years. Showed this statue on a poster a thousand times. Hello, old friend. Finally.', 'My granddaughter said "FaceTime me from the crown, abuela." Those stairs better behave.'],
    },
  },
  {
    id: 'dmytro', name: 'Dmytro', home: 'Lviv, Ukraine', flag: '🇺🇦', skin: 0xf0cfa8, hair: 0x6b4a2a,
    outfit: 'vyshyvanka', c1: 0xf6f0e6, c2: 0xc4484a,
    lines: {
      ferry: ['My vyshyvanka was embroidered by my mother. Today it sees the statue of freedom. Fitting.', 'The sea air! Lviv is beautiful but very, very inland.'],
      island: ['A torch that never goes out. We understand that where I am from.', 'I will write my mother tonight: "She is even taller than hope, mamo."'],
      chat: ['Liberty is not a monument where I come from — it is a daily practice. Seeing her standing here… it helps. It truly helps.', 'I am a baker. American pretzels are just bagels that dreamed bigger, yes?'],
    },
  },
]
