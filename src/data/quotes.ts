// src/data/quotes.ts
// Built-in quote library. The app works fully without a database; quotes in
// the database (if configured) are merged on top of these.

export type QuoteCategory =
  | "motivational"
  | "romantic"
  | "funny"
  | "calm"
  | "resilience"
  | "gratitude"
  | "wisdom";

export interface Quote {
  id: string;
  text: string;
  author: string;
  category: QuoteCategory | string;
}

export interface CategoryMeta {
  id: QuoteCategory;
  label: string;
  emoji: string;
  hue: number;
  description: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "motivational", label: "Motivational", emoji: "🔥", hue: 25, description: "Fuel for the next small step forward." },
  { id: "romantic", label: "Romantic", emoji: "💖", hue: 335, description: "On love, closeness and the people who matter." },
  { id: "funny", label: "Funny", emoji: "😂", hue: 95, description: "Because laughing is a perfectly valid coping strategy." },
  { id: "calm", label: "Calm", emoji: "🌊", hue: 190, description: "Slow down. Breathe. You have time." },
  { id: "resilience", label: "Resilience", emoji: "🌱", hue: 150, description: "For the days that ask a lot of you." },
  { id: "gratitude", label: "Gratitude", emoji: "🙏", hue: 45, description: "Noticing what's already good." },
  { id: "wisdom", label: "Kaizen Wisdom", emoji: "🪷", hue: 265, description: "Little by little, one travels far." },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<QuoteCategory, CategoryMeta>;

export function isCategory(id: unknown): id is QuoteCategory {
  return typeof id === "string" && id in CATEGORY_MAP;
}

type Raw = [text: string, author: string];

const RAW: Record<QuoteCategory, Raw[]> = {
  motivational: [
    ["Believe you can and you're halfway there.", "Theodore Roosevelt"],
    ["The only way to do great work is to love what you do.", "Steve Jobs"],
    ["It does not matter how slowly you go as long as you do not stop.", "Confucius"],
    ["The secret of getting ahead is getting started.", "Mark Twain"],
    ["Whether you think you can, or you think you can't — you're right.", "Henry Ford"],
    ["Act as if what you do makes a difference. It does.", "William James"],
    ["Start where you are. Use what you have. Do what you can.", "Arthur Ashe"],
    ["Small deeds done are better than great deeds planned.", "Peter Marshall"],
    ["Success is the sum of small efforts, repeated day in and day out.", "Robert Collier"],
    ["You miss 100% of the shots you don't take.", "Wayne Gretzky"],
  ],
  romantic: [
    ["Love all, trust a few, do wrong to none.", "William Shakespeare"],
    ["Whatever our souls are made of, his and mine are the same.", "Emily Brontë"],
    ["Where there is love there is life.", "Mahatma Gandhi"],
    ["To love and be loved is to feel the sun from both sides.", "David Viscott"],
    ["The best thing to hold onto in life is each other.", "Audrey Hepburn"],
    ["Love does not consist in gazing at each other, but in looking outward together in the same direction.", "Antoine de Saint-Exupéry"],
    ["Being deeply loved by someone gives you strength, while loving someone deeply gives you courage.", "Lao Tzu"],
    ["Love is composed of a single soul inhabiting two bodies.", "Aristotle"],
  ],
  funny: [
    ["I am so clever that sometimes I don't understand a single word of what I am saying.", "Oscar Wilde"],
    ["I can resist everything except temptation.", "Oscar Wilde"],
    ["The road to success is dotted with many tempting parking spaces.", "Will Rogers"],
    ["I love deadlines. I love the whooshing noise they make as they go by.", "Douglas Adams"],
    ["Age is something that doesn't matter, unless you are a cheese.", "Luis Buñuel"],
    ["If you think you are too small to make a difference, try sleeping with a mosquito.", "Dalai Lama"],
    ["Never put off till tomorrow what may be done day after tomorrow just as well.", "Mark Twain"],
    ["People say nothing is impossible, but I do nothing every day.", "A. A. Milne"],
    ["I always arrive late at the office, but I make up for it by leaving early.", "Charles Lamb"],
  ],
  calm: [
    ["Nature does not hurry, yet everything is accomplished.", "Lao Tzu"],
    ["Within you, there is a stillness and a sanctuary to which you can retreat at any time.", "Hermann Hesse"],
    ["Almost everything will work again if you unplug it for a few minutes, including you.", "Anne Lamott"],
    ["Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.", "Thich Nhat Hanh"],
    ["You can't stop the waves, but you can learn to surf.", "Jon Kabat-Zinn"],
    ["Rest is not idleness.", "John Lubbock"],
    ["Quiet the mind, and the soul will speak.", "Ma Jaya Sati Bhagavati"],
  ],
  resilience: [
    ["Fall seven times, stand up eight.", "Japanese proverb"],
    ["Out of difficulties grow miracles.", "Jean de La Bruyère"],
    ["Even the darkest night will end and the sun will rise.", "Victor Hugo"],
    ["This too shall pass.", "Persian adage"],
    ["You may encounter many defeats, but you must not be defeated.", "Maya Angelou"],
    ["Rock bottom became the solid foundation on which I rebuilt my life.", "J. K. Rowling"],
    ["The wound is the place where the Light enters you.", "Rumi"],
    ["Hope is being able to see that there is light despite all of the darkness.", "Desmond Tutu"],
  ],
  gratitude: [
    ["Gratitude turns what we have into enough, and more.", "Melody Beattie"],
    ["Enjoy the little things, for one day you may look back and realize they were the big things.", "Robert Brault"],
    ["When I started counting my blessings, my whole life turned around.", "Willie Nelson"],
    ["Gratitude is not only the greatest of virtues, but the parent of all others.", "Cicero"],
    ["Wear gratitude like a cloak, and it will feed every corner of your life.", "Rumi"],
    ["Acknowledging the good that you already have in your life is the foundation for all abundance.", "Eckhart Tolle"],
  ],
  wisdom: [
    ["A journey of a thousand miles begins with a single step.", "Lao Tzu"],
    ["We are what we repeatedly do. Excellence, then, is not an act, but a habit.", "Will Durant"],
    ["Little by little, one travels far.", "J. R. R. Tolkien"],
    ["The man who moves a mountain begins by carrying away small stones.", "Confucius"],
    ["Continuous improvement is better than delayed perfection.", "Mark Twain"],
    ["Knowing yourself is the beginning of all wisdom.", "Aristotle"],
    ["Drop by drop is the water pot filled.", "The Buddha"],
  ],
};

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export const QUOTES: Quote[] = (Object.keys(RAW) as QuoteCategory[]).flatMap(
  (category) =>
    RAW[category].map(([text, author]) => ({
      id: `${category}-${slug(text)}`,
      text,
      author,
      category,
    }))
);

export function normalizeQuoteText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}
