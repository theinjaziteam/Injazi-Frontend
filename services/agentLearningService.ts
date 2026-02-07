// services/agentLearningService.ts
// Agent Learning and Memory System
// Enables agents to learn from interactions and improve over time

const API_URL = import.meta.env.VITE_API_URL || 'https://injazi-backend.onrender.com';

export interface UserPreference {
    key: string;
    value: any;
    confidence: number; // 0-1, how confident we are about this preference
    learnedFrom: string[]; // Action IDs that contributed to learning this
    lastUpdated: number;
}

export interface AgentLearning {
    userId: string;
    agentType: string;
    preferences: UserPreference[];
    successPatterns: {
        pattern: string;
        successRate: number;
        timesUsed: number;
    }[];
    failurePatterns: {
        pattern: string;
        failureRate: number;
        timesEncountered: number;
        avoidanceStrategy: string;
    }[];
    optimizations: {
        task: string;
        originalApproach: string;
        optimizedApproach: string;
        improvementPercent: number;
    }[];
}

export interface InteractionFeedback {
    actionId: string;
    userId: string;
    agentType: string;
    wasSuccessful: boolean;
    userSatisfaction?: number; // 1-5 rating
    feedback?: string;
    timeToComplete?: number;
    resourcesUsed?: any;
}

class AgentLearningService {
    private learnings: Map<string, AgentLearning> = new Map();

    // Record interaction feedback
    async recordFeedback(feedback: InteractionFeedback): Promise<void> {
        try {
            const response = await fetch(`${API_URL}/api/master-agent/learning/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedback)
            });

            if (!response.ok) {
                throw new Error('Failed to record feedback');
            }

            // Update local learning cache
            await this.updateLearning(feedback.userId, feedback.agentType);
        } catch (error) {
            console.error('Record feedback error:', error);
            throw error;
        }
    }

    // Get agent learning data
    async getLearning(userId: string, agentType: string): Promise<AgentLearning> {
        const key = `${userId}-${agentType}`;
        
        // Check cache first
        if (this.learnings.has(key)) {
            return this.learnings.get(key)!;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/master-agent/learning/${encodeURIComponent(userId)}/${agentType}`
            );

            if (!response.ok) {
                throw new Error('Failed to get learning data');
            }

            const data = await response.json();
            this.learnings.set(key, data.learning);
            return data.learning;
        } catch (error) {
            console.error('Get learning error:', error);
            // Return empty learning object
            return {
                userId,
                agentType,
                preferences: [],
                successPatterns: [],
                failurePatterns: [],
                optimizations: []
            };
        }
    }

    // Update learning from new feedback
    private async updateLearning(userId: string, agentType: string): Promise<void> {
        try {
            const response = await fetch(
                `${API_URL}/api/master-agent/learning/${encodeURIComponent(userId)}/${agentType}`
            );

            if (response.ok) {
                const data = await response.json();
                const key = `${userId}-${agentType}`;
                this.learnings.set(key, data.learning);
            }
        } catch (error) {
            console.error('Update learning error:', error);
        }
    }

    // Learn user preference
    async learnPreference(
        userId: string,
        agentType: string,
        key: string,
        value: any,
        actionId: string
    ): Promise<void> {
        try {
            const response = await fetch(`${API_URL}/api/master-agent/learning/preference`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    agentType,
                    key,
                    value,
                    actionId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to learn preference');
            }

            await this.updateLearning(userId, agentType);
        } catch (error) {
            console.error('Learn preference error:', error);
            throw error;
        }
    }

    // Get recommendations based on learning
    async getRecommendations(
        userId: string,
        agentType: string,
        context: any
    ): Promise<string[]> {
        try {
            const response = await fetch(`${API_URL}/api/master-agent/learning/recommendations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    agentType,
                    context
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get recommendations');
            }

            const data = await response.json();
            return data.recommendations || [];
        } catch (error) {
            console.error('Get recommendations error:', error);
            return [];
        }
    }

    // Analyze success patterns
    analyzeSuccessPatterns(learning: AgentLearning): {
        topPatterns: string[];
        insights: string[];
    } {
        const sortedPatterns = [...learning.successPatterns]
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, 5);

        const insights: string[] = [];

        if (sortedPatterns.length > 0) {
            const topPattern = sortedPatterns[0];
            insights.push(
                `Most successful approach: "${topPattern.pattern}" with ${Math.round(topPattern.successRate * 100)}% success rate`
            );
        }

        const highVolumePatterns = learning.successPatterns.filter(p => p.timesUsed > 10);
        if (highVolumePatterns.length > 0) {
            insights.push(
                `${highVolumePatterns.length} proven strategies with 10+ uses`
            );
        }

        return {
            topPatterns: sortedPatterns.map(p => p.pattern),
            insights
        };
    }

    // Get optimization suggestions
    getOptimizationSuggestions(learning: AgentLearning): string[] {
        const suggestions: string[] = [];

        // Check for low success rate patterns
        const lowSuccessPatterns = learning.successPatterns.filter(
            p => p.successRate < 0.5 && p.timesUsed > 3
        );

        if (lowSuccessPatterns.length > 0) {
            suggestions.push(
                `Consider avoiding: ${lowSuccessPatterns.map(p => p.pattern).join(', ')}`
            );
        }

        // Check for high-performing optimizations
        const topOptimizations = learning.optimizations
            .filter(o => o.improvementPercent > 20)
            .slice(0, 3);

        if (topOptimizations.length > 0) {
            suggestions.push(
                `Apply these optimizations: ${topOptimizations.map(o => o.task).join(', ')}`
            );
        }

        // Check for failure patterns to avoid
        if (learning.failurePatterns.length > 0) {
            const criticalFailures = learning.failurePatterns.filter(
                f => f.failureRate > 0.7
            );
            if (criticalFailures.length > 0) {
                suggestions.push(
                    `Avoid these approaches: ${criticalFailures.map(f => f.pattern).join(', ')}`
                );
            }
        }

        return suggestions;
    }

    // Clear learning data
    async clearLearning(userId: string, agentType?: string): Promise<void> {
        try {
            const response = await fetch(`${API_URL}/api/master-agent/learning/clear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, agentType })
            });

            if (!response.ok) {
                throw new Error('Failed to clear learning data');
            }

            // Clear local cache
            if (agentType) {
                const key = `${userId}-${agentType}`;
                this.learnings.delete(key);
            } else {
                // Clear all for user
                for (const key of this.learnings.keys()) {
                    if (key.startsWith(`${userId}-`)) {
                        this.learnings.delete(key);
                    }
                }
            }
        } catch (error) {
            console.error('Clear learning error:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const agentLearningService = new AgentLearningService();
