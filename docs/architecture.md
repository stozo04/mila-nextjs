# Mila NextJS Architecture

## Overview

Mila NextJS is a modern full-stack application for capturing and sharing parenting memories. The application is built with Next.js 15 (App Router) and integrates several key technologies:

- **Frontend**: Next.js 15 with React 19
- **Backend**: Supabase (PostgreSQL + Auth)
- **AI Features**: OpenAI (Chat Assistant + TTS)
- **UI Framework**: Bootstrap 5 with custom SCSS
- **Analytics**: Vercel Analytics + Google GA4

## System Architecture

### Frontend Architecture

```
src/
├─ app/                    # Next.js App Router
│   ├─ (protected)/       # Auth-required routes
│   │   ├─ blogs/        
│   │   ├─ sonograms/    
│   │   ├─ baby-shower/  
│   │   ├─ gender-reveal/
│   │   └─ my-journey/   
│   ├─ (public)/         # Public routes
│   └─ api/              # API routes
├─ components/           # React components
│   ├─ Blog/            # Blog-related components
│   ├─ Journey/         # Journey-related components
│   ├─ BabyShower/      # Baby shower components
│   ├─ Bootstrap/       # Bootstrap integration
│   └─ Shared/          # Shared components
├─ lib/                 # Shared libraries
├─ types/               # TypeScript types
└─ utils/               # Utility functions
```

### Backend Architecture

#### Database Schema (Supabase)

1. **Blogs Table**
   - Primary content storage
   - Includes: title, content, slug, date, tags
   - Supports: featured images, detail images

2. **Journey Cards Table**
   - Milestone tracking
   - Types: first_year, one_year, two_year
   - Includes: title, message, date, journey_type

3. **Chat Questions Table**
   - Stores chat history
   - Includes: question, created_at

4. **Blog Audio Table**
   - Caches TTS audio
   - Includes: slug (PK), audio_data, created_at

### Authentication & Authorization

- **Middleware-based Auth**: `src/middleware.ts`
- **Protected Routes**: Using route groups `(protected)`
- **Google OAuth**: Authentication through Supabase Auth
- **Admin Access**: Email-based admin privileges for content management

### API Routes

1. **Chat API** (`/api/chat`)
   - OpenAI integration
   - Threaded conversations
   - Question storage

2. **Blog Audio API** (`/api/blog/[slug]/audio`)
   - Text-to-Speech generation
   - Audio caching
   - Streaming response

3. **Chat Status API** (`/api/poll-chat-status`)
   - Polls OpenAI completion status
   - Manages async responses

### Data Flow

1. **Authentication Flow**
   ```
   Client → Middleware → Supabase Auth → Protected Route/Redirect
   ```

2. **Blog Content Flow**
   ```
   Client → API Route → Supabase → Cache (if applicable) → Response
   ```

3. **Chat Flow**
   ```
   Client → API Route → OpenAI → Supabase (storage) → Streaming Response
   ```

## Key Features

### 1. Protected Routes
- Middleware-based authentication
- Route group organization
- Google OAuth integration
- Admin-only content management

### 2. Blog System
- Rich text content
- Image management
- Tag-based organization
- Text-to-Speech capability

### 3. Journey Tracking
- Milestone categorization
- Timeline organization
- Media attachments

### 4. AI Integration
- OpenAI-powered chatbot
- Text-to-Speech for blogs
- Response caching

### 5. Media Management
- Supabase storage integration
- Image optimization
- Gallery organization

## Development Patterns

### 1. State Management
- React hooks for local state
- Supabase real-time for sync
- Server components for initial state

### 2. Error Handling
- Global error boundaries
- API error standardization
- Graceful degradation

### 3. Performance
- Image optimization
- Response caching
- Streaming responses
- Edge runtime support

### 4. Security
- Row Level Security (RLS)
- Environment variable protection
- CORS configuration
- Protected route groups

## Environment Configuration

Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_ASSISTANT_ID=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_ADMIN_EMAIL=    # For admin-only features
```

## Schema Documentation

JSON schemas are available in `/docs/schemas/`:
- `blog.schema.json`: Blog post structure
- `journey.schema.json`: Journey card structure
- `chat.schema.json`: Chat message structure
- `components.schema.json`: Component props

## Deployment

The application is deployed on Vercel with:
- Edge Functions support
- Analytics integration
- Environment variable management
- Automatic preview deployments
