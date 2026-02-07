# AI Master Agent System

## Overview

The InJazi AI Master Agent System is a comprehensive multi-agent orchestration platform inspired by [OpenClaw](https://github.com/openclaw/openclaw). It enables autonomous task execution across multiple domains through specialized AI agents that work together to accomplish complex user goals.

## Architecture

### Core Components

1. **Master Agent Service** (`services/masterAgentService.ts`)
   - Central orchestrator that coordinates all specialized agents
   - Manages agent lifecycle, status, and capabilities
   - Routes user requests to appropriate agents
   - Tracks action execution and results

2. **Agent Coordinator Service** (`services/agentCoordinatorService.ts`)
   - Handles multi-agent workflows
   - Manages dependencies between agent actions
   - Provides workflow templates for common tasks
   - Enables parallel and sequential agent execution

3. **Agent Learning Service** (`services/agentLearningService.ts`)
   - Implements agent memory and learning capabilities
   - Tracks user preferences and patterns
   - Analyzes success/failure patterns
   - Provides optimization suggestions

4. **Agent Dashboard View** (`views/AgentDashboardView.tsx`)
   - User interface for monitoring and controlling agents
   - Displays pending actions requiring approval
   - Shows active workflows and their progress
   - Provides agent analytics and insights

## Available Agents

### 1. Commerce Master (Ecommerce Agent)
**Capabilities:**
- Store setup and configuration (Shopify)
- Product management (scraping, optimization, publishing)
- Email marketing campaigns (Klaviyo integration)
- Social media content generation (TikTok, Instagram, Facebook)
- Analytics and performance tracking

### 2. Productivity Optimizer
**Capabilities:**
- Task management (Todoist, Notion, Asana)
- Calendar synchronization (Google Calendar, Outlook)
- Email management and automation
- Document generation and organization

### 3. Learning Architect
**Capabilities:**
- Curriculum generation
- Content curation
- Quiz and assessment creation
- Progress tracking and adaptation

### 4. Research Assistant
**Capabilities:**
- Web research and analysis
- Data processing and visualization
- Report generation
- Trend analysis

### 5. Content Creator
**Capabilities:**
- Blog writing and articles
- Social media posts
- Video script writing
- SEO optimization

### 6. Health Coach
**Capabilities:**
- Fitness tracking (Apple Health, Google Fit, Strava)
- Nutrition planning
- Sleep analysis
- Wellness reminders

### 7. Finance Manager
**Capabilities:**
- Expense tracking
- Budget planning
- Investment analysis
- Bill reminders

### 8. Social Coordinator
**Capabilities:**
- Event planning
- Network management
- Message drafting
- Social analytics

## Key Features

### Autonomous Mode
- Agents can execute approved actions automatically
- Reduces manual intervention for routine tasks
- Configurable approval requirements per action type

### Workflow Templates
Pre-built workflows for common scenarios:

1. **Complete Store Setup**
   - Create Shopify store
   - Import products
   - Set up email marketing
   - Generate social media content

2. **Content Marketing Campaign**
   - Research trending topics
   - Generate blog content
   - Create social posts
   - Send email campaigns

3. **Product Launch**
   - Market research
   - Landing page creation
   - Email sequence setup
   - Social media campaign

### Agent Learning
- Agents learn from user feedback
- Adapt strategies based on success patterns
- Avoid approaches that previously failed
- Optimize task execution over time

### Multi-Agent Collaboration
- Agents can work together on complex tasks
- Primary agent leads with supporting agents
- Shared context and results
- Coordinated execution

## Usage

### Basic Agent Interaction

```typescript
import { masterAgentService } from './services/masterAgentService';

// Send a request to the master agent
const response = await masterAgentService.orchestrate({
    userEmail: 'user@example.com',
    userMessage: 'Set up my online store and import 10 products',
    context: {
        goal: userGoal,
        currentTasks: userTasks,
        connectedApps: userApps
    }
});

// The master agent will:
// 1. Analyze the request
// 2. Select the appropriate agent (Commerce Master)
// 3. Break down into actionable steps
// 4. Return suggested actions for approval
```

### Creating Custom Workflows

```typescript
import { agentCoordinatorService } from './services/agentCoordinatorService';

// Create a custom workflow
const workflow = agentCoordinatorService.createWorkflow(
    'My Custom Workflow',
    'Description of what this workflow does',
    [
        {
            agentType: AgentType.RESEARCH,
            action: 'Research market trends',
            dependencies: []
        },
        {
            agentType: AgentType.CONTENT,
            action: 'Create blog post based on research',
            dependencies: ['step-0']
        },
        {
            agentType: AgentType.ECOMMERCE,
            action: 'Promote blog post on social media',
            dependencies: ['step-1']
        }
    ]
);

// Execute the workflow
await agentCoordinatorService.executeWorkflow(workflow.id, userEmail);
```

### Agent Learning

```typescript
import { agentLearningService } from './services/agentLearningService';

// Record feedback after an action
await agentLearningService.recordFeedback({
    actionId: 'action-123',
    userId: 'user-456',
    agentType: AgentType.ECOMMERCE,
    wasSuccessful: true,
    userSatisfaction: 5,
    feedback: 'Perfect product descriptions!',
    timeToComplete: 120
});

// Get learned preferences
const learning = await agentLearningService.getLearning(
    userId,
    AgentType.ECOMMERCE
);

// Get optimization suggestions
const suggestions = agentLearningService.getOptimizationSuggestions(learning);
```

## Backend Integration

The agent system integrates with the InJazi backend at:
https://github.com/theinjaziteam/Injazi/tree/main/service

### Required Backend Endpoints

```
POST /api/master-agent/orchestrate
POST /api/master-agent/execute
POST /api/master-agent/actions/approve
POST /api/master-agent/actions/reject
GET  /api/master-agent/actions/:actionId
GET  /api/master-agent/analytics
POST /api/master-agent/learning/feedback
GET  /api/master-agent/learning/:userId/:agentType
POST /api/master-agent/learning/preference
POST /api/master-agent/learning/recommendations
```

## Security & Privacy

- All agent actions require user approval by default
- Sensitive operations (payments, data deletion) always require explicit approval
- User data is encrypted in transit and at rest
- Agents operate within user-defined permissions
- OAuth tokens are securely stored and managed

## Future Enhancements

- [ ] Voice command integration
- [ ] Computer vision for visual task verification
- [ ] Browser automation for web tasks
- [ ] Mobile app automation
- [ ] Advanced scheduling and triggers
- [ ] Agent-to-agent communication protocols
- [ ] Custom agent creation by users
- [ ] Marketplace for community-created agents

## Comparison to OpenClaw

| Feature | InJazi Agents | OpenClaw |
|---------|---------------|----------|
| Multi-agent orchestration | ✅ | ✅ |
| Autonomous execution | ✅ | ✅ |
| Learning from feedback | ✅ | ✅ |
| Workflow templates | ✅ | ✅ |
| Browser automation | 🚧 Planned | ✅ |
| Computer vision | 🚧 Planned | ✅ |
| Voice commands | 🚧 Planned | ✅ |
| Mobile-first design | ✅ | ❌ |
| Goal-oriented | ✅ | ❌ |
| Ecommerce specialization | ✅ | ❌ |

## Getting Started

1. Navigate to the Agent Dashboard from the main dashboard
2. Review available agents and their capabilities
3. Enable autonomous mode if desired
4. Start a conversation with the master agent
5. Approve suggested actions
6. Monitor progress in real-time

## Support

For issues or questions about the AI Agent System:
- Email: support@injazi.app
- Documentation: https://docs.injazi.app/agents
- GitHub: https://github.com/theinjaziteam/Injazi-Frontend
