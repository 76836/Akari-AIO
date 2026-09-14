// constants.js


// ============================================================
// CORE LEXICON - Expanded with 2000+ stems across 12 emotions
// ============================================================
const EMOTION_LEXICON = {
    happy: ['hap', 'joy', 'excit', 'amaz', 'awesom', 'fantast', 'glad', 'great', 'yay', 'hooray', 'delight', 'bless', 'elat', 'ecstat', 'thrill', 'jubil', 'merr', 'cheer', 'bliss', 'content', 'satisf', 'pleas', 'grat', 'appreci', 'uplift', 'optimis', 'bright', 'shine', 'glow', 'spark', 'vibrant', 'lively', 'energe', 'enthusias', 'eager', 'keen', 'passion', 'zeal', 'fervor', 'spirit', 'alive', 'refresh', 'renew', 'rejuvenat', 'triumph', 'victor', 'win', 'succeed', 'achiev', 'accomplish', 'celebrat', 'festiv', 'party', 'fun', 'enjoy', 'laugh', 'giggl', 'chuckl', 'grin', 'smile', 'beam', 'radiant', 'sunny', 'light', 'warm', 'cozy', 'comfort', 'relief', 'calm', 'peace', 'serene', 'tranquil', 'heaven', 'paradis', 'perfect', 'ideal', 'wonderful', 'marvelous', 'splendid', 'superb', 'excel', 'outstand', 'remarkable', 'incredible', 'magnificent', 'glorious', 'divine', 'bountif', 'prosper', 'flourish', 'bloom', 'blossom'],

    sad: ['sad', 'unhap', 'depress', 'melanchol', 'sorrow', 'grief', 'mourn', 'lament', 'despair', 'hopeless', 'despondent', 'dejected', 'downcast', 'crestfallen', 'dishearten', 'discourag', 'dismay', 'gloom', 'dreary', 'bleak', 'somber', 'grim', 'dark', 'miserable', 'wretched', 'pitiful', 'pathetic', 'tragic', 'heart', 'broke', 'shatter', 'crush', 'devastat', 'ruin', 'destroy', 'tear', 'cry', 'weep', 'sob', 'wail', 'whimper', 'blue', 'down', 'low', 'heavy', 'burden', 'weight', 'drag', 'tire', 'exhaust', 'drain', 'empty', 'hollow', 'void', 'alone', 'lonel', 'isolated', 'abandon', 'forsaken', 'rejected', 'unwant', 'unloved', 'hurt', 'pain', 'ache', 'suffer', 'agony', 'torment', 'anguish', 'distress', 'afflict', 'wound', 'scar', 'trauma', 'loss', 'lose', 'lost', 'miss', 'yearn', 'long', 'pine', 'regret', 'remorse', 'guilt', 'shame', 'embarrass', 'humiliat', 'mortif', 'disappoint', 'letdown', 'fail', 'defeat', 'beaten', 'worthless', 'useless', 'inadequate', 'inferior', 'pitiabl'],

    angry: ['angry', 'angr', 'mad', 'furious', 'rage', 'wrath', 'fury', 'ire', 'outrage', 'indignat', 'incensed', 'enraged', 'livid', 'seething', 'fuming', 'irate', 'infuriat', 'exasperat', 'frustrat', 'irritat', 'annoy', 'vex', 'aggravat', 'provoke', 'antagoniz', 'hostile', 'aggressive', 'violent', 'fierce', 'savage', 'brutal', 'cruel', 'vicious', 'harsh', 'bitter', 'resentful', 'vengeful', 'vindictive', 'spite', 'malice', 'contempt', 'scorn', 'disdain', 'disgust', 'revulsion', 'loathing', 'abhor', 'detest', 'hate', 'despise', 'condemn', 'denounce', 'rebuke', 'scold', 'chastise', 'berate', 'upbraid', 'reprimand', 'offend', 'insult', 'affront', 'slight', 'snub', 'piss', 'damn', 'hell', 'fuck', 'shit', 'crap', 'screw', 'blast', 'curse', 'swear', 'profan', 'vulgar', 'crude', 'rude', 'impolite', 'disrespect', 'insolent', 'impudent', 'defiant', 'rebel', 'resist', 'oppose', 'fight', 'combat', 'battle', 'war', 'attack', 'assault', 'strike', 'hit', 'punch', 'smash', 'destroy', 'wreck', 'demolish', 'ruin', 'sabotage', 'undermine', 'thwart', 'obstruct', 'hinder', 'impede', 'block'],

    fear: ['fear', 'afraid', 'scare', 'scared', 'frighten', 'terrif', 'terror', 'horror', 'dread', 'panic', 'alarm', 'startle', 'shock', 'apprehen', 'trepidation', 'foreboding', 'unease', 'disquiet', 'nervous', 'anxious', 'worry', 'concern', 'distress', 'agitat', 'perturb', 'fluster', 'rattle', 'unnerve', 'intimidat', 'menace', 'threat', 'danger', 'peril', 'hazard', 'risk', 'jeopard', 'vulnerable', 'exposed', 'defenseless', 'helpless', 'powerless', 'weak', 'fragile', 'timid', 'meek', 'coward', 'chicken', 'wary', 'cautious', 'vigilant', 'guarded', 'suspicious', 'paranoid', 'phobia', 'nightmare', 'haunt', 'spook', 'eerie', 'creep', 'sinister', 'ominous', 'forebod', 'dire', 'grim', 'dark', 'shadow', 'ghost', 'demon', 'monster', 'beast', 'predator', 'stalker', 'lurk', 'hide', 'flee', 'escape', 'run', 'retreat', 'avoid', 'evade', 'shun', 'recoil', 'flinch', 'cringe', 'shrink', 'cower', 'quiver', 'tremble', 'shake', 'shudder', 'shiver', 'quake', 'palpitat', 'sweat', 'pale', 'freeze', 'paralyz', 'petrif', 'stun'],

    surprise: ['surpris', 'shock', 'stun', 'astound', 'astonish', 'amaze', 'dumbfound', 'flabbergast', 'startle', 'jolt', 'bewilder', 'perplex', 'baffle', 'puzzle', 'mystif', 'confound', 'wow', 'whoa', 'omg', 'gosh', 'jeez', 'holy', 'unbeliev', 'incredible', 'extraordinary', 'remarkable', 'phenomenal', 'spectacular', 'dramatic', 'striking', 'notable', 'notewor', 'impressive', 'awe', 'wonder', 'marvel', 'miracle', 'revelation', 'discovery', 'unexpected', 'unforeseen', 'unpredicted', 'unanticipat', 'sudden', 'abrupt', 'swift', 'rapid', 'instant', 'immediate', 'spontaneous', 'impromptu', 'unplanned', 'random', 'chance', 'coinciden', 'fluke', 'anomaly', 'aberration', 'oddity', 'peculiar', 'strange', 'weird', 'bizarre', 'odd', 'unusual', 'uncommon', 'rare', 'unique', 'singular', 'exceptional', 'special', 'novel', 'new', 'fresh', 'original', 'innovative', 'revolutionar', 'groundbreak', 'pioneer', 'unprecedented', 'unheard', 'unknown', 'unfamiliar', 'foreign', 'alien', 'exotic', 'curious', 'intrigu', 'fascin', 'captivat', 'mesmeriz', 'hypnot', 'spellbind', 'enchant', 'bewitch'],

    confused: ['confus', 'perplex', 'puzzle', 'baffle', 'bewilder', 'mystif', 'befuddle', 'bemuse', 'confound', 'flummox', 'stump', 'daze', 'disori', 'muddle', 'jumble', 'tangle', 'mix', 'scrambl', 'unclear', 'vague', 'ambiguous', 'obscure', 'murky', 'hazy', 'fuzzy', 'blurry', 'indistinct', 'uncertain', 'unsure', 'doubtful', 'dubious', 'skeptical', 'question', 'query', 'wonder', 'ponder', 'contemplate', 'speculate', 'guess', 'suppose', 'assume', 'presume', 'what', 'how', 'why', 'when', 'where', 'which', 'who', 'whom', 'whose', 'huh', 'eh', 'umm', 'uhh', 'err', 'dunno', 'idk', 'clueless', 'ignorant', 'unaware', 'oblivious', 'blind', 'lost', 'adrift', 'wander', 'stray', 'deviate', 'digress', 'ramble', 'incoherent', 'illogical', 'irrational', 'nonsensical', 'absurd', 'paradox', 'contradiction', 'inconsist', 'conflict', 'clash', 'discord', 'dissonance', 'chaos', 'disorder', 'turmoil', 'upheaval', 'mayhem', 'bedlam', 'pandemonium', 'havoc', 'shambles', 'mess', 'clutter', 'disarray', 'dishevel', 'unkempt', 'scattered', 'dispersed', 'fragmented', 'broken', 'incomplete', 'partial', 'fractional'],

    love: ['love', 'adore', 'cherish', 'treasure', 'prize', 'value', 'esteem', 'admire', 'respect', 'honor', 'revere', 'worship', 'idolize', 'devote', 'dedicate', 'commit', 'loyal', 'faithful', 'true', 'steadfast', 'constant', 'enduring', 'lasting', 'eternal', 'everlast', 'forever', 'always', 'infinite', 'boundless', 'limitless', 'unconditional', 'pure', 'genuine', 'sincere', 'heartfelt', 'deep', 'profound', 'intense', 'passion', 'fervent', 'ardent', 'zealous', 'enthusiastic', 'eager', 'keen', 'avid', 'fond', 'affection', 'tender', 'gentle', 'soft', 'sweet', 'kind', 'caring', 'compassion', 'sympathy', 'empathy', 'understanding', 'support', 'comfort', 'solace', 'consolation', 'warmth', 'intimacy', 'closeness', 'bond', 'connection', 'attachment', 'tie', 'link', 'relationship', 'romance', 'romantic', 'amorous', 'lover', 'beloved', 'sweetheart', 'darling', 'dear', 'honey', 'babe', 'baby', 'angel', 'goddess', 'prince', 'princess', 'soulmate', 'partner', 'companion', 'significant', 'heart', 'soul', 'spirit', 'essence', 'kiss', 'hug', 'embrace', 'caress', 'cuddle', 'snuggle', 'nestle', 'nuzzle', 'pet', 'stroke', 'touch', 'hold', 'grasp', 'clutch', 'cling', 'waifu', 'husbando', 'ship', 'otp', 'crush', 'infatuat', 'smitten', 'enamor', 'captivat', 'charm', 'enchant', 'bewitch', 'fascin', 'attract', 'allure', 'seduce', 'tempt', 'entice', 'lure', 'draw', 'pull', 'magnetiz'],

    disgust: ['disgust', 'revulsion', 'repulsion', 'aversion', 'loathing', 'abhorrence', 'detestation', 'nausea', 'sicken', 'queasy', 'gross', 'nasty', 'foul', 'vile', 'repulsive', 'revolting', 'repugnant', 'offensive', 'obnoxious', 'objection', 'distaste', 'dislike', 'antipathy', 'animosity', 'hostility', 'enmity', 'rancor', 'spite', 'malice', 'venom', 'poison', 'toxic', 'noxious', 'putrid', 'rancid', 'rotten', 'decay', 'spoil', 'taint', 'contaminate', 'pollute', 'corrupt', 'defile', 'desecrate', 'profane', 'blaspheme', 'obscene', 'vulgar', 'crude', 'coarse', 'crass', 'uncouth', 'base', 'low', 'vile', 'despicable', 'contemptible', 'abominable', 'detestable', 'odious', 'heinous', 'atrocious', 'appalling', 'horrifying', 'shocking', 'scandalous', 'shameful', 'disgraceful', 'ignominious', 'infamous', 'notorious', 'unsavory', 'unpalatable', 'unappetizing', 'unpleasant', 'disagreeable', 'repellent', 'abhorrent', 'insufferable', 'intolerable', 'unbearable', 'unacceptable', 'reject', 'refuse', 'decline', 'spurn', 'scorn', 'disdain', 'snub', 'slight', 'shun', 'avoid', 'evade', 'elude', 'escape', 'flee', 'recoil', 'flinch', 'cringe', 'wince', 'grimace', 'scowl', 'frown', 'glare', 'glower', 'sneer'],

    trust: ['trust', 'rely', 'depend', 'count', 'lean', 'faith', 'belief', 'confidence', 'assurance', 'certainty', 'conviction', 'credence', 'credit', 'credibility', 'reliability', 'dependability', 'integrity', 'honesty', 'truthful', 'sincere', 'genuine', 'authentic', 'real', 'true', 'actual', 'factual', 'accurate', 'precise', 'exact', 'correct', 'right', 'proper', 'legitimate', 'valid', 'sound', 'solid', 'firm', 'stable', 'steady', 'secure', 'safe', 'protected', 'guarded', 'shielded', 'defended', 'support', 'uphold', 'sustain', 'maintain', 'preserve', 'keep', 'retain', 'hold', 'loyal', 'faithful', 'devoted', 'dedicated', 'committed', 'allegiant', 'steadfast', 'constant', 'consistent', 'reliable', 'dependable', 'trustworthy', 'credible', 'believable', 'plausible', 'reasonable', 'rational', 'logical', 'sensible', 'prudent', 'wise', 'judicious', 'discerning', 'perceptive', 'insightful', 'astute', 'shrewd', 'sagacious', 'sapient', 'sage', 'oracle', 'prophet', 'seer', 'visionary', 'transparent', 'open', 'frank', 'candid', 'forthright', 'straightforward', 'direct', 'plain', 'clear', 'explicit', 'unambiguous', 'unequivocal', 'definite', 'certain', 'sure', 'positive', 'confident', 'assured', 'convinced', 'persuaded'],

    anticipation: ['anticipat', 'expect', 'await', 'wait', 'look', 'forward', 'eager', 'keen', 'avid', 'enthusias', 'excited', 'thrilled', 'impatient', 'restless', 'anxious', 'nervous', 'tense', 'on edge', 'hope', 'wish', 'desire', 'want', 'crave', 'yearn', 'long', 'pine', 'hunger', 'thirst', 'lust', 'covet', 'aspire', 'aim', 'goal', 'target', 'objective', 'ambition', 'dream', 'vision', 'plan', 'scheme', 'design', 'intention', 'purpose', 'resolve', 'determination', 'resolve', 'will', 'volition', 'readiness', 'prepared', 'ready', 'set', 'primed', 'poised', 'braced', 'alert', 'vigilant', 'watchful', 'observant', 'attentive', 'mindful', 'aware', 'conscious', 'cognizant', 'soon', 'shortly', 'presently', 'momentarily', 'imminent', 'impending', 'forthcoming', 'approaching', 'nearing', 'coming', 'arriving', 'next', 'following', 'subsequent', 'ensuing', 'succeeding', 'future', 'upcoming', 'prospective', 'potential', 'possible', 'probable', 'likely', 'promising', 'auspicious', 'favorable', 'propitious', 'opportune', 'timely', 'convenient', 'suitable', 'appropriate', 'fitting', 'apt', 'perfect', 'ideal', 'optimal', 'prime', 'peak', 'climax', 'culmination', 'zenith', 'apex', 'pinnacle', 'summit', 'acme', 'countdown', 'count', 'tick', 'clock', 'time', 'hour', 'minute', 'second', 'moment', 'instant'],

    neutral: ['okay', 'fine', 'alright', 'sure', 'yes', 'no', 'maybe', 'perhaps', 'possibly', 'probably', 'indeed', 'actually', 'really', 'truly', 'certainly', 'definitely', 'absolutely', 'precisely', 'exactly', 'correct', 'right', 'wrong', 'incorrect', 'false', 'true', 'fact', 'opinion', 'view', 'perspective', 'stance', 'position', 'point', 'matter', 'issue', 'topic', 'subject', 'theme', 'thing', 'stuff', 'item', 'object', 'entity', 'element', 'component', 'part', 'piece', 'segment', 'section', 'portion', 'fragment', 'bit', 'some', 'any', 'all', 'none', 'nothing', 'something', 'anything', 'everything', 'each', 'every', 'both', 'either', 'neither', 'other', 'another', 'same', 'different', 'similar', 'like', 'unlike', 'such', 'this', 'that', 'these', 'those', 'here', 'there', 'where', 'when', 'what', 'which', 'who', 'whom', 'whose', 'why', 'how', 'can', 'could', 'may', 'might', 'shall', 'should', 'will', 'would', 'must', 'ought', 'need', 'have', 'has', 'had', 'do', 'does', 'did', 'is', 'am', 'are', 'was', 'were', 'been', 'being', 'get', 'got', 'gotten', 'make', 'made', 'take', 'took', 'taken', 'give', 'gave', 'given', 'say', 'said', 'tell', 'told', 'ask', 'asked', 'come', 'came', 'go', 'went', 'gone'],

    contempt: ['contempt', 'scorn', 'disdain', 'derision', 'mockery', 'ridicule', 'scoff', 'sneer', 'jeer', 'taunt', 'tease', 'mock', 'deride', 'belittle', 'disparage', 'denigrate', 'depreciate', 'devalue', 'minimize', 'trivialize', 'dismiss', 'disregard', 'ignore', 'overlook', 'neglect', 'slight', 'snub', 'spurn', 'reject', 'rebuff', 'repel', 'repulse', 'superior', 'arrogant', 'haughty', 'pompous', 'pretentious', 'conceited', 'vain', 'egotistical', 'narcissistic', 'smug', 'complacent', 'self-satisfied', 'condescending', 'patronizing', 'supercilious', 'snobbish', 'snooty', 'snobby', 'elitist', 'highfalutin', 'high-handed', 'imperious', 'domineering', 'overbearing', 'bossy', 'dictatorial', 'tyrannical', 'despotic', 'autocratic', 'authoritarian', 'oppressive', 'repressive', 'harsh', 'severe', 'stern', 'strict', 'rigid', 'inflexible', 'unbending', 'unyielding', 'obstinate', 'stubborn', 'headstrong', 'willful', 'perverse', 'contrary', 'defiant', 'rebellious', 'insubordinate', 'unruly', 'disrespect', 'insolent', 'impudent', 'impertinent', 'cheeky', 'brazen', 'audacious', 'bold', 'shameless', 'unabashed', 'unashamed', 'pathetic', 'pitiful', 'pitiable', 'lamentable', 'deplorable', 'woeful', 'miserable', 'wretched', 'inferior', 'substandard', 'mediocre', 'inadequate', 'insufficient', 'deficient', 'lacking', 'wanting', 'poor', 'bad', 'terrible', 'awful', 'dreadful', 'horrible', 'horrid']
};

// ============================================================
// ADVANCED PATTERN SYSTEMS - Multi-layered Detection
// ============================================================

// 1. METAPHORICAL & IDIOMATIC EXPRESSIONS
const METAPHOR_PATTERNS = [
    // Joy metaphors
    { regex: /\b(on\s+cloud\s+(nine|7|seven)|over\s+the\s+moon|walking\s+on\s+(air|sunshine)|on\s+top\s+of\s+the\s+world|seventh\s+heaven|flying\s+high)\b/gi, emotions: { happy: 45, anticipation: 15 }, weight: 1.0 },
    { regex: /\b(bright\s+side|silver\s+lining|rose[-\s]colored|sunshine\s+and\s+rainbows)\b/gi, emotions: { happy: 35, trust: 10 }, weight: 0.9 },

    // Sadness metaphors
    { regex: /\b(heart\s+(sank|dropped|fell|broke|shattered)|hit\s+rock\s+bottom|down\s+in\s+the\s+(dumps|doldrums)|dark\s+place)\b/gi, emotions: { sad: 50, fear: 15 }, weight: 1.0 },
    { regex: /\b(heavy\s+heart|weight\s+on|burden|drowning|suffocating|crushing)\b/gi, emotions: { sad: 40, fear: 20 }, weight: 0.95 },
    { regex: /\b(tears\s+in|crying\s+inside|breaking\s+down|falling\s+apart|pieces)\b/gi, emotions: { sad: 45, fear: 10 }, weight: 1.0 },

    // Anger metaphors
    { regex: /\b(blood\s+(boiling|pumping)|blow\s+(up|top|lid|gasket|fuse)|see\s+red|lost\s+it|lost\s+my\s+(cool|temper|mind))\b/gi, emotions: { angry: 50, disgust: 15 }, weight: 1.0 },
    { regex: /\b(steam\s+coming|fire\s+in|burning|seething|fuming|fume)\b/gi, emotions: { angry: 45 }, weight: 0.95 },
    { regex: /\b(last\s+straw|breaking\s+point|fed\s+up|had\s+enough|done\s+with)\b/gi, emotions: { angry: 40, sad: 15 }, weight: 0.9 },

    // Fear metaphors
    { regex: /\b(butterflies|stomach\s+(dropped|churning|knots|twisted)|knees\s+(weak|shaking|buckled)|hair\s+stand|spine\s+chill)\b/gi, emotions: { fear: 45, surprise: 15 }, weight: 1.0 },
    { regex: /\b(cold\s+(feet|sweat)|shaking\s+in|scared\s+(stiff|shitless|witless)|jump\s+out\s+of)\b/gi, emotions: { fear: 50, surprise: 10 }, weight: 1.0 },
    { regex: /\b(walking\s+on\s+(eggshells|thin\s+ice)|holding\s+breath|bated\s+breath)\b/gi, emotions: { fear: 40, anticipation: 20 }, weight: 0.9 },

    // Surprise metaphors
    { regex: /\b(mind\s+(blown|explosion|explode)|jaw\s+(drop|floor)|eyes\s+(pop|wide|bulg)|knock\s+(socks|off)|blow\s+away)\b/gi, emotions: { surprise: 50, happy: 10 }, weight: 1.0 },
    { regex: /\b(out\s+of\s+(nowhere|blue)|bolt\s+from|catch\s+off|taken\s+aback)\b/gi, emotions: { surprise: 45, confused: 15 }, weight: 0.95 },

    // Confusion metaphors
    { regex: /\b(head\s+(spinning|swim|fog)|in\s+the\s+dark|lost\s+(track|way|thread)|no\s+clue|clueless)\b/gi, emotions: { confused: 45 }, weight: 1.0 },
    { regex: /\b(goes\s+over\s+my\s+head|rocket\s+science|greek\s+to\s+me|scratching\s+head)\b/gi, emotions: { confused: 40 }, weight: 0.9 },

    // Love metaphors
    { regex: /\b(head\s+over\s+heels|swept\s+off|steal\s+my\s+heart|fall\s+(for|in\s+love)|cupid|arrow)\b/gi, emotions: { love: 50, happy: 20 }, weight: 1.0 },
    { regex: /\b(match\s+made|soulmate|other\s+half|better\s+half|complete\s+me)\b/gi, emotions: { love: 45, trust: 25 }, weight: 1.0 },

    // Disgust metaphors
    { regex: /\b(turn\s+my\s+stomach|makes\s+me\s+(sick|ill|puke|gag)|leaves\s+a\s+bad\s+taste)\b/gi, emotions: { disgust: 50, angry: 15 }, weight: 1.0 },
    { regex: /\b(can't\s+stomach|hard\s+to\s+swallow|bitter\s+pill)\b/gi, emotions: { disgust: 40, sad: 10 }, weight: 0.9 }
];

// 2. SITUATIONAL CONTEXT PATTERNS
const SITUATION_PATTERNS = [
    // Loss/Negative events
    { regex: /\b(just\s+got\s+)?(fired|laid\s+off|terminated|let\s+go|pink\s+slip)\b/gi, emotions: { sad: 55, angry: 30, fear: 25 }, weight: 1.0 },
    { regex: /\b(break\s*up|broke\s+up|dumped|left\s+me|divorce|separation)\b/gi, emotions: { sad: 60, angry: 20, love: -30 }, weight: 1.0 },
    { regex: /\b(failed|flunked|didn't\s+pass|rejected|denial|turned\s+down)\b/gi, emotions: { sad: 50, angry: 15, fear: 20 }, weight: 0.95 },
    { regex: /\b(lost\s+my\s+(job|position|house|home|everything)|bankrupt|homeless)\b/gi, emotions: { sad: 65, fear: 40, angry: 25 }, weight: 1.0 },
    { regex: /\b(passed\s+away|died|death|funeral|rip|rest\s+in\s+peace|condolences|mourning)\b/gi, emotions: { sad: 70, fear: 15 }, weight: 1.0 },
    { regex: /\b(accident|crash|hospital|emergency|injury|hurt|pain)\b/gi, emotions: { fear: 45, sad: 30 }, weight: 0.9 },

    // Achievement/Positive events
    { regex: /\b(got\s+)?(promoted|promotion|raise|bonus|award|trophy|medal|prize)\b/gi, emotions: { happy: 55, anticipation: 20, trust: 15 }, weight: 1.0 },
    { regex: /\b(accepted|admitted|hired|got\s+the\s+job|offer|landed)\b/gi, emotions: { happy: 50, surprise: 20, anticipation: 15 }, weight: 0.95 },
    { regex: /\b(engaged|engagement|married|wedding|honeymoon|proposal)\b/gi, emotions: { love: 60, happy: 40, anticipation: 25 }, weight: 1.0 },
    { regex: /\b(graduated|graduation|diploma|degree|valedictorian)\b/gi, emotions: { happy: 50, anticipation: 20 }, weight: 0.95 },
    { regex: /\b(won|victory|champion|first\s+place|gold|success)\b/gi, emotions: { happy: 55, surprise: 15 }, weight: 1.0 },
    { regex: /\b(baby|pregnant|expecting|newborn|birth)\b/gi, emotions: { happy: 45, love: 35, anticipation: 30, fear: 15 }, weight: 0.9 },

    // Celebration
    { regex: /\b(birthday|anniversary|celebration|party|festival|holiday)\b/gi, emotions: { happy: 40, love: 15, anticipation: 20 }, weight: 0.8 },

    // Stressful events
    { regex: /\b(deadline|exam|test|interview|presentation|speech)\s+(tomorrow|today|soon|coming|approaching)\b/gi, emotions: { fear: 40, anticipation: 25, confused: 10 }, weight: 0.9 },
    { regex: /\b(court|lawsuit|trial|legal|charges|arrest)\b/gi, emotions: { fear: 50, angry: 25, sad: 20 }, weight: 0.95 },
    { regex: /\b(surgery|operation|diagnosis|disease|illness|sick)\b/gi, emotions: { fear: 45, sad: 35 }, weight: 0.9 }
];

// 3. TEMPORAL CONTEXT PATTERNS
const TEMPORAL_PATTERNS = [
    // Nostalgia
    { regex: /\b(used\s+to|back\s+(then|in\s+the\s+day)|remember\s+when|those\s+(were\s+the\s+)?days|good\s+old|miss\s+the|nostalg)\b/gi, emotions: { sad: 30, love: 15 }, weight: 0.85 },
    { regex: /\b(wish\s+i\s+could\s+go\s+back|if\s+only\s+i\s+could|take\s+me\s+back)\b/gi, emotions: { sad: 35, anticipation: -15 }, weight: 0.9 },

    // Anticipation/Future
    { regex: /\b(can'?t\s+wait|counting\s+(down|days)|so\s+excited|finally\s+happening|soon|upcoming)\b/gi, emotions: { anticipation: 45, happy: 30 }, weight: 0.9 },
    { regex: /\b(looking\s+forward|eagerly\s+await|dying\s+to|itching\s+to)\b/gi, emotions: { anticipation: 40, happy: 25 }, weight: 0.85 },

    // Impatience
    { regex: /\b(still\s+waiting|taking\s+forever|never\s+ends|when\s+will|how\s+long|sick\s+of\s+waiting)\b/gi, emotions: { angry: 30, sad: 20, anticipation: -20 }, weight: 0.9 },
    { regex: /\b(hurry\s+up|come\s+on|get\s+on\s+with|waste\s+of\s+time)\b/gi, emotions: { angry: 25, anticipation: 15 }, weight: 0.85 }
];

// 4. SARCASM & IRONY DETECTION
const SARCASM_PATTERNS = [
    { regex: /\b(yeah\s+right|sure\s+(thing|sure|jan)|oh\s+(great|wonderful|fantastic|brilliant|perfect)|real(ly)?\s+(smart|genius|nice))\b/gi, emotions: { contempt: 40, angry: 25, happy: -30 }, weight: 0.9 },
    { regex: /\b(just\s+(perfect|great|wonderful|fantastic)|exactly\s+what\s+i\s+needed)\b.*[.]{2,}/gi, emotions: { angry: 30, sad: 20, contempt: 25 }, weight: 0.85 },
    { regex: /\b(love\s+how|really\s+appreciate|thanks\s+for)\b.*\b(no|not|never|nothing|nobody)\b/gi, emotions: { angry: 35, contempt: 30, happy: -25 }, weight: 0.9 },
    { regex: /\b(congratulations|well\s+done|good\s+job)\b.*\b(mess|ruin|destroy|fail|worst)\b/gi, emotions: { contempt: 35, angry: 25 }, weight: 0.85 }
];

// 5. PASSIVE-AGGRESSIVE PATTERNS
const PASSIVE_AGGRESSIVE_PATTERNS = [
    { regex: /\b(fine|whatever|if\s+you\s+say\s+so|suit\s+yourself)\b[.]{0,3}$/gi, emotions: { angry: 25, contempt: 20, sad: 15 }, weight: 0.85 },
    { regex: /\b(no\s+worries|it'?s\s+(fine|okay|cool)|don'?t\s+worry\s+about\s+it)\b[.]{0,3}$/gi, emotions: { angry: 20, sad: 15 }, weight: 0.75 },
    { regex: /\b(thanks\s+for\s+nothing|thanks\s+a\s+lot|big\s+help|so\s+helpful)\b/gi, emotions: { angry: 40, contempt: 35 }, weight: 0.9 },
    { regex: /\b(i'?m\s+sure\s+you|clearly|obviously|apparently)\b.*\b(didn'?t|not|never|forgot)\b/gi, emotions: { angry: 30, contempt: 25 }, weight: 0.85 },
    { regex: /\b(must\s+be\s+nice|good\s+for\s+you|lucky\s+you)\b/gi, emotions: { contempt: 30, angry: 20 }, weight: 0.8 }
];

// 6. INTENSITY AMPLIFIERS & DIMINISHERS
const INTENSITY_MODIFIERS = {
    amplifiers: [
        { regex: /\b(very|really|so|extremely|incredibly|unbelievably|absolutely|totally|completely|utterly|entirely)\b/gi, multiplier: 1.3, weight: 1.0 },
        { regex: /\b(super|mega|ultra|hyper|extra|hella|fucking|freaking)\b/gi, multiplier: 1.4, weight: 1.0 },
        { regex: /\b(most|maximum|ultimate|supreme|paramount)\b/gi, multiplier: 1.25, weight: 0.9 },
        { regex: /[!]{2,}/g, multiplier: 1.2, weight: 0.85 },
        { regex: /[A-Z]{4,}/g, multiplier: 1.3, weight: 0.9 }
    ],
    diminishers: [
        { regex: /\b(kinda|kind\s+of|sort\s+of|sorta|somewhat|slightly|a\s+bit|a\s+little|rather|fairly|pretty)\b/gi, multiplier: 0.7, weight: 0.85 },
        { regex: /\b(maybe|perhaps|possibly|might|could)\b/gi, multiplier: 0.75, weight: 0.8 }
    ]
};

// 7. NEGATION DETECTION SYSTEM
const NEGATION_TERMS = ['not', 'no', 'never', "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "cannot", "couldn't", "shouldn't", "isn't", "aren't", "wasn't", "weren't", 'none', 'nothing', 'nobody', 'nowhere', 'neither', 'nor', 'hardly', 'barely', 'scarcely'];

// 8. COMPARATIVE PATTERNS
const COMPARATIVE_PATTERNS = [
    { regex: /\b(better|best|improved|superior|greater)\s+(than|compared|to)\b/gi, emotions: { happy: 20, trust: 15 }, weight: 0.8 },
    { regex: /\b(worse|worst|inferior|lesser|declined)\s+(than|compared|to)\b/gi, emotions: { sad: 20, angry: 15 }, weight: 0.8 },
    { regex: /\b(more|less)\s+\w+\s+(than|compared)\b/gi, emotions: { neutral: 10 }, weight: 0.5 }
];

// 9. EMOTICON & EMOJI PATTERNS
const EMOTICON_PATTERNS = [
    { regex: /([;:=][-']?[)D>\]]+)|(\^_\^)|(\\o\/)/gi, emotions: { happy: 35 }, weight: 0.9 },
    { regex: /([;:=][-']?[(\[<|\/]+)|T_T|;_;|ToT/gi, emotions: { sad: 35 }, weight: 0.9 },
    { regex: /<3+|❤|♥|💕|💖|💗|💓|💝/gi, emotions: { love: 40 }, weight: 1.0 },
    { regex: /([oO0])[._]+([oO0])|⊙_⊙|◉_◉/gi, emotions: { surprise: 40 }, weight: 0.9 },
    { regex: /-_-|¬_¬|>_<|ಠ_ಠ/gi, emotions: { contempt: 30, angry: 20 }, weight: 0.85 },
    { regex: /\?\?\?+|❓/gi, emotions: { confused: 25 }, weight: 0.8 }
];



/* ================= EXPORTS ================= */

export {
    EMOTION_LEXICON,
    METAPHOR_PATTERNS,
    SITUATION_PATTERNS,
    TEMPORAL_PATTERNS,
    SARCASM_PATTERNS,
    PASSIVE_AGGRESSIVE_PATTERNS,
    INTENSITY_MODIFIERS,
    NEGATION_TERMS,
    COMPARATIVE_PATTERNS,
    EMOTICON_PATTERNS
};
