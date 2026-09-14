// engine.js 

import {
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
} from "./constants.js";


 // 10. QUESTION COMPLEXITY ANALYSIS
        function analyzeQuestions(text) {
            const questions = (text.match(/\?/g) || []).length;
            const whQuestions = (text.match(/\b(what|why|how|when|where|who|which)\b/gi) || []).length;
            return {
                multipleQuestions: questions > 2 ? { confused: 20 * questions } : {},
                rhetoricalQuestions: whQuestions > 0 && questions > 0 ? { confused: 15, angry: 10 } : {}
            };
        }

        // ============================================================
        // CORE ANALYSIS ENGINE
        // ============================================================
        
        function levenshteinDistance(a, b) {
            const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
            
            for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
            for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
            
            for (let j = 1; j <= b.length; j++) {
                for (let i = 1; i <= a.length; i++) {
                    const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                    matrix[j][i] = Math.min(
                        matrix[j][i - 1] + 1,
                        matrix[j - 1][i] + 1,
                        matrix[j - 1][i - 1] + cost
                    );
                }
            }
            
            return matrix[b.length][a.length];
        }

        function analyzeEmotion(text) {
            if (!text || text.trim().length === 0) {
                return { dominant: 'neutral', scores: {}, confidence: 0, patterns: [], details: {} };
            }

            const emotionScores = {};
            Object.keys(EMOTION_LEXICON).forEach(e => emotionScores[e] = 0);
            
            const detectedPatterns = [];
            const debugDetails = {
                lexicalMatches: [],
                metaphorMatches: [],
                situationalMatches: [],
                temporalMatches: [],
                sarcasmDetected: false,
                negationAdjustments: [],
                intensityModifications: []
            };

            // ============================================================
            // PHASE 1: LEXICAL ANALYSIS with Fuzzy Matching
            // ============================================================
            const words = text.toLowerCase().replace(/[^\w\s'-]/g, ' ').split(/\s+/);
            const wordPositions = new Map();
            
            words.forEach((word, index) => {
                if (word.length < 3) return;
                const cleanWord = word.replace(/[^a-z]/g, '');
                if (cleanWord.length < 3) return;
                
                wordPositions.set(index, cleanWord);
                
                Object.entries(EMOTION_LEXICON).forEach(([emotion, stems]) => {
                    stems.forEach(stem => {
                        // Direct prefix match (highest confidence)
                        if (cleanWord.startsWith(stem)) {
                            emotionScores[emotion] += 18;
                            debugDetails.lexicalMatches.push({ word, stem, emotion, type: 'prefix', score: 18 });
                        }
                        // Fuzzy match for typos (medium confidence)
                        else if (cleanWord.length >= 4 && stem.length >= 4) {
                            const distance = levenshteinDistance(cleanWord, stem);
                            const threshold = stem.length > 6 ? 2 : 1;
                            if (distance <= threshold) {
                                const score = 12 - (distance * 3);
                                emotionScores[emotion] += score;
                                debugDetails.lexicalMatches.push({ word, stem, emotion, type: 'fuzzy', distance, score });
                            }
                        }
                        // Contains match (low confidence)
                        else if (cleanWord.length >= 6 && cleanWord.includes(stem) && stem.length >= 4) {
                            emotionScores[emotion] += 8;
                            debugDetails.lexicalMatches.push({ word, stem, emotion, type: 'contains', score: 8 });
                        }
                    });
                });
            });

            // ============================================================
            // PHASE 2: PATTERN MATCHING (Metaphors, Situations, etc.)
            // ============================================================
            
            // Apply metaphorical patterns
            METAPHOR_PATTERNS.forEach(pattern => {
                const matches = text.match(pattern.regex);
                if (matches) {
                    detectedPatterns.push(`Metaphor: ${matches[0]}`);
                    Object.entries(pattern.emotions).forEach(([emotion, score]) => {
                        const adjustedScore = score * pattern.weight;
                        emotionScores[emotion] = (emotionScores[emotion] || 0) + adjustedScore;
                    });
                    debugDetails.metaphorMatches.push({ match: matches[0], emotions: pattern.emotions });
                }
            });

            // Apply situational patterns
            SITUATION_PATTERNS.forEach(pattern => {
                const matches = text.match(pattern.regex);
                if (matches) {
                    detectedPatterns.push(`Situation: ${matches[0]}`);
                    Object.entries(pattern.emotions).forEach(([emotion, score]) => {
                        const adjustedScore = score * pattern.weight;
                        emotionScores[emotion] = (emotionScores[emotion] || 0) + adjustedScore;
                    });
                    debugDetails.situationalMatches.push({ match: matches[0], emotions: pattern.emotions });
                }
            });

            // Apply temporal patterns
            TEMPORAL_PATTERNS.forEach(pattern => {
                const matches = text.match(pattern.regex);
                if (matches) {
                    detectedPatterns.push(`Temporal: ${matches[0]}`);
                    Object.entries(pattern.emotions).forEach(([emotion, score]) => {
                        const adjustedScore = score * pattern.weight;
                        emotionScores[emotion] = (emotionScores[emotion] || 0) + adjustedScore;
                    });
                    debugDetails.temporalMatches.push({ match: matches[0], emotions: pattern.emotions });
                }
            });

            // ============================================================
            // PHASE 3: SARCASM & PASSIVE-AGGRESSIVE DETECTION
            // ============================================================
            
            let sarcasmDetected = false;
            SARCASM_PATTERNS.forEach(pattern => {
                if (text.match(pattern.regex)) {
                    sarcasmDetected = true;
                    detectedPatterns.push('Sarcasm Detected');
                    Object.entries(pattern.emotions).forEach(([emotion, score]) => {
                        emotionScores[emotion] = (emotionScores[emotion] || 0) + (score * pattern.weight);
                    });
                }
            });

            PASSIVE_AGGRESSIVE_PATTERNS.forEach(pattern => {
                if (text.match(pattern.regex)) {
                    detectedPatterns.push('Passive-Aggressive Tone');
                    Object.entries(pattern.emotions).forEach(([emotion, score]) => {
                        emotionScores[emotion] = (emotionScores[emotion] || 0) + (score * pattern.weight);
                    });
                }
            });

            debugDetails.sarcasmDetected = sarcasmDetected;

            // ============================================================
            // PHASE 4: NEGATION CONTEXT ANALYSIS
            // ============================================================
            
            const lowerText = text.toLowerCase();
            NEGATION_TERMS.forEach(negation => {
                const regex = new RegExp(`\\b${negation}\\b`, 'gi');
                let match;
                while ((match = regex.exec(lowerText)) !== null) {
                    const windowStart = match.index;
                    const windowEnd = Math.min(match.index + 60, lowerText.length);
                    const window = lowerText.substring(windowStart, windowEnd);
                    
                    // Check for emotion words in negation window
                    Object.entries(EMOTION_LEXICON).forEach(([emotion, stems]) => {
                        stems.forEach(stem => {
                            if (window.includes(stem) && stem.length >= 3) {
                                // Apply negation penalty
                                const penalty = 18;
                                emotionScores[emotion] = Math.max(0, emotionScores[emotion] - penalty);
                                
                                // Add opposite emotion for certain cases
                                if (emotion === 'happy' && emotionScores[emotion] >= 0) {
                                    emotionScores['sad'] += 25;
                                    debugDetails.negationAdjustments.push({ negation, emotion, oppositeBoost: 'sad', amount: 25 });
                                } else if (emotion === 'love') {
                                    emotionScores['sad'] += 20;
                                    debugDetails.negationAdjustments.push({ negation, emotion, oppositeBoost: 'sad', amount: 20 });
                                } else if (emotion === 'sad' && negation === 'not') {
                                    emotionScores['happy'] += 15;
                                    debugDetails.negationAdjustments.push({ negation, emotion, oppositeBoost: 'happy', amount: 15 });
                                }
                                
                                debugDetails.negationAdjustments.push({ negation, stem, emotion, penalty });
                            }
                        });
                    });
                }
            });

            // ============================================================
            // PHASE 5: INTENSITY MODIFICATION
            // ============================================================
            
            let globalMultiplier = 1.0;
            
            // Amplifiers
            INTENSITY_MODIFIERS.amplifiers.forEach(modifier => {
                const matches = text.match(modifier.regex);
                if (matches) {
                    const boost = 1 + ((matches.length * (modifier.multiplier - 1)) * modifier.weight);
                    globalMultiplier *= Math.min(boost, 2.5); // Cap at 2.5x
                    detectedPatterns.push(`Intensity: ${matches.length}x ${matches[0]}`);
                    debugDetails.intensityModifications.push({ type: 'amplifier', matches, multiplier: boost });
                }
            });
            
            // Diminishers
            INTENSITY_MODIFIERS.diminishers.forEach(modifier => {
                const matches = text.match(modifier.regex);
                if (matches) {
                    const reduction = Math.pow(modifier.multiplier, matches.length * modifier.weight);
                    globalMultiplier *= Math.max(reduction, 0.3); // Floor at 0.3x
                    detectedPatterns.push(`Diminisher: ${matches[0]}`);
                    debugDetails.intensityModifications.push({ type: 'diminisher', matches, multiplier: reduction });
                }
            });

            // Apply global multiplier to all non-neutral emotions
            Object.keys(emotionScores).forEach(emotion => {
                if (emotion !== 'neutral' && emotionScores[emotion] > 5) {
                    emotionScores[emotion] *= globalMultiplier;
                }
            });

            // ============================================================
            // PHASE 6: COMPARATIVE & QUESTION ANALYSIS
            // ============================================================
            
            COMPARATIVE_PATTERNS.forEach(pattern => {
                if (text.match(pattern.regex)) {
                    Object.entries(pattern.emotions).forEach(([emotion, score]) => {
                        emotionScores[emotion] = (emotionScores[emotion] || 0) + (score * pattern.weight);
                    });
                }
            });

            const questionAnalysis = analyzeQuestions(text);
            Object.values(questionAnalysis).forEach(emotions => {
                Object.entries(emotions).forEach(([emotion, score]) => {
                    emotionScores[emotion] = (emotionScores[emotion] || 0) + score;
                });
            });

            // ============================================================
            // PHASE 7: EMOTICON ANALYSIS
            // ============================================================
            
            EMOTICON_PATTERNS.forEach(pattern => {
                const matches = text.match(pattern.regex);
                if (matches) {
                    Object.entries(pattern.emotions).forEach(([emotion, score]) => {
                        emotionScores[emotion] = (emotionScores[emotion] || 0) + (score * pattern.weight * matches.length);
                    });
                    detectedPatterns.push(`Emoticon: ${matches.join(', ')}`);
                }
            });

            // ============================================================
            // PHASE 8: NORMALIZATION & SCORING
            // ============================================================
            
            // Remove neutral baseline if other emotions are present
            const totalNonNeutral = Object.entries(emotionScores)
                .filter(([e]) => e !== 'neutral')
                .reduce((sum, [, score]) => sum + Math.max(0, score), 0);
            
            if (totalNonNeutral > 30) {
                emotionScores['neutral'] = Math.max(0, emotionScores['neutral'] * 0.3);
            }

            // Find dominant emotion
            let maxScore = 0;
            let dominant = 'neutral';
            
            Object.entries(emotionScores).forEach(([emotion, score]) => {
                if (score > maxScore) {
                    maxScore = score;
                    dominant = emotion;
                }
            });

            // Calculate confidence (0-100%)
            const totalScore = Object.values(emotionScores).reduce((sum, s) => sum + Math.max(0, s), 0);
            const confidence = totalScore > 0 ? Math.min(100, (maxScore / totalScore) * 100) : 0;

            // Normalize scores to 0-100 range for display
            const normalizedScores = {};
            const maxPossible = Math.max(...Object.values(emotionScores), 1);
            Object.entries(emotionScores).forEach(([emotion, score]) => {
                normalizedScores[emotion] = Math.max(0, (score / maxPossible) * 100);
            });

            return {
                dominant,
                scores: normalizedScores,
                rawScores: emotionScores,
                confidence: confidence.toFixed(1),
                patterns: detectedPatterns,
                details: debugDetails,
                wordCount: words.length,
                sarcasmDetected
            };
        }


// ============================================================
// EXPORTS
// ============================================================
export { analyzeEmotion };
export default analyzeEmotion;
