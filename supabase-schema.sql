-- ============================================================
-- Grade 6 English Curriculum Tracker — Supabase Schema
-- Run this in your Supabase project SQL Editor
-- ============================================================

-- Standards: NYSED Grade 6 ELA
create table if not exists public.standards (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  strand      text not null,
  description text not null,
  created_at  timestamptz default now()
);

-- Profiles with roles (auto-created on sign-up via trigger below)
create table if not exists public.profiles (
  id          uuid references auth.users primary key,
  email       text not null,
  full_name   text,
  role        text not null default 'teacher',  -- 'teacher' | 'hod'
  created_at  timestamptz default now()
);

-- Coverage logs
create table if not exists public.coverage_logs (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid references auth.users not null,
  standard_id uuid references public.standards not null,
  taught_date date not null,
  notes       text,
  created_at  timestamptz default now()
);

create index if not exists coverage_logs_teacher on public.coverage_logs (teacher_id, taught_date desc);

-- Lesson plans
create table if not exists public.lesson_plans (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid references auth.users not null,
  title        text not null,
  week_start   date not null,
  description  text,
  status       text not null default 'draft',  -- draft | submitted | approved | revision
  hod_feedback text,
  reviewed_by  uuid references auth.users,
  reviewed_at  timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists lesson_plans_teacher on public.lesson_plans (teacher_id, week_start desc);
create index if not exists lesson_plans_status on public.lesson_plans (status);

-- Lesson plan ↔ standards junction
create table if not exists public.lesson_plan_standards (
  id             uuid primary key default gen_random_uuid(),
  lesson_plan_id uuid references public.lesson_plans on delete cascade not null,
  standard_id    uuid references public.standards not null,
  unique(lesson_plan_id, standard_id)
);

-- Students
create table if not exists public.students (
  id             uuid primary key default gen_random_uuid(),
  teacher_id     uuid references auth.users not null,
  full_name      text not null,
  student_number text,
  created_at     timestamptz default now()
);

create index if not exists students_teacher on public.students (teacher_id, full_name);

-- Student attainment per standard
create table if not exists public.student_progress (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid references public.students not null,
  standard_id   uuid references public.standards not null,
  attainment    text not null default 'not_assessed',  -- not_assessed | below | approaching | meeting | exceeding
  assessed_date date,
  notes         text,
  updated_at    timestamptz default now(),
  unique(student_id, standard_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.standards         enable row level security;
alter table public.profiles          enable row level security;
alter table public.coverage_logs     enable row level security;
alter table public.lesson_plans      enable row level security;
alter table public.lesson_plan_standards enable row level security;
alter table public.students          enable row level security;
alter table public.student_progress  enable row level security;

-- Helper: check if current user is HOD
create or replace function public.is_hod()
returns boolean language sql security definer as $$
  select coalesce(
    (select role = 'hod' from public.profiles where id = auth.uid()),
    false
  )
$$;

-- Standards: readable by all authenticated users
create policy "Standards readable by all" on public.standards
  for select using (auth.uid() is not null);

-- Profiles
create policy "Profiles readable by all authenticated" on public.profiles
  for select using (auth.uid() is not null);

create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Coverage logs: teachers see own; HOD sees all
create policy "Coverage: own or HOD" on public.coverage_logs
  for select using (auth.uid() = teacher_id or public.is_hod());

create policy "Coverage: teachers insert own" on public.coverage_logs
  for insert with check (auth.uid() = teacher_id);

create policy "Coverage: teachers delete own" on public.coverage_logs
  for delete using (auth.uid() = teacher_id);

-- Lesson plans: teachers see own; HOD sees all
create policy "Plans: own or HOD" on public.lesson_plans
  for select using (auth.uid() = teacher_id or public.is_hod());

create policy "Plans: teachers insert own" on public.lesson_plans
  for insert with check (auth.uid() = teacher_id);

create policy "Plans: teachers update own draft/revision" on public.lesson_plans
  for update using (
    (auth.uid() = teacher_id and status in ('draft', 'revision'))
    or public.is_hod()
  );

create policy "Plans: teachers delete own draft" on public.lesson_plans
  for delete using (auth.uid() = teacher_id and status = 'draft');

-- Lesson plan standards
create policy "Plan standards: readable if plan is accessible" on public.lesson_plan_standards
  for select using (
    exists (
      select 1 from public.lesson_plans lp
      where lp.id = lesson_plan_id
        and (lp.teacher_id = auth.uid() or public.is_hod())
    )
  );

create policy "Plan standards: insert/delete if teacher owns plan" on public.lesson_plan_standards
  for all using (
    exists (
      select 1 from public.lesson_plans lp
      where lp.id = lesson_plan_id
        and lp.teacher_id = auth.uid()
    )
  );

-- Students: teachers see own; HOD sees all
create policy "Students: own or HOD" on public.students
  for select using (auth.uid() = teacher_id or public.is_hod());

create policy "Students: teachers manage own" on public.students
  for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

-- Student progress: teacher of the student or HOD
create policy "Progress: teacher or HOD" on public.student_progress
  for select using (
    exists (
      select 1 from public.students s
      where s.id = student_id and (s.teacher_id = auth.uid() or public.is_hod())
    )
  );

create policy "Progress: teacher manages" on public.student_progress
  for all using (
    exists (
      select 1 from public.students s
      where s.id = student_id and s.teacher_id = auth.uid()
    )
  );

-- ============================================================
-- Auto-create profile on sign-up
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Seed: NYSED Grade 6 ELA Standards
-- ============================================================

insert into public.standards (code, strand, description) values

-- Reading Literature
('RL.6.1',  'Reading Literature',        'Cite textual evidence to support analysis of what the text says explicitly as well as inferences drawn from the text.'),
('RL.6.2',  'Reading Literature',        'Determine a theme or central idea of a text and how it is conveyed through particular details; provide a summary of the text distinct from personal opinions or judgments.'),
('RL.6.3',  'Reading Literature',        'Describe how a particular story''s or drama''s plot unfolds in a series of episodes as well as how the characters respond or change as the plot moves toward a resolution.'),
('RL.6.4',  'Reading Literature',        'Determine the meaning of words and phrases as they are used in a text, including figurative and connotative meanings; analyze the impact of a specific word choice on meaning and tone.'),
('RL.6.5',  'Reading Literature',        'Analyze how a particular sentence, chapter, scene, or stanza fits into the overall structure of a text and contributes to the development of the theme, setting, or plot.'),
('RL.6.6',  'Reading Literature',        'Explain how an author develops the point of view of the narrator or speaker in a text.'),
('RL.6.7',  'Reading Literature',        'Compare and contrast the experience of reading a story, drama, or poem to listening to or viewing an audio, video, or live version of the text.'),
('RL.6.9',  'Reading Literature',        'Compare and contrast texts in different forms or genres in terms of their approaches to similar themes and topics.'),
('RL.6.10', 'Reading Literature',        'By the end of the year, read and comprehend literature, including stories, dramas, and poems, in the grades 6–8 text complexity band proficiently.'),

-- Reading Informational Text
('RI.6.1',  'Reading Informational Text','Cite textual evidence to support analysis of what the text says explicitly as well as inferences drawn from the text.'),
('RI.6.2',  'Reading Informational Text','Determine a central idea of a text and how it is conveyed through particular details; provide a summary of the text distinct from personal opinions or judgments.'),
('RI.6.3',  'Reading Informational Text','Analyze in detail how a key individual, event, or idea is introduced, illustrated, and elaborated in a text.'),
('RI.6.4',  'Reading Informational Text','Determine the meaning of words and phrases as they are used in a text, including figurative, connotative, and technical meanings.'),
('RI.6.5',  'Reading Informational Text','Analyze how a particular sentence, paragraph, chapter, or section fits into the overall structure of a text and contributes to the development of the ideas.'),
('RI.6.6',  'Reading Informational Text','Determine an author''s point of view or purpose in a text and explain how it is conveyed in the text.'),
('RI.6.7',  'Reading Informational Text','Integrate information presented in different media or formats as well as in words to develop a coherent understanding of a topic or issue.'),
('RI.6.8',  'Reading Informational Text','Trace and evaluate the argument and specific claims in a text, distinguishing claims that are supported by reasons and evidence from claims that are not.'),
('RI.6.9',  'Reading Informational Text','Compare and contrast one author''s presentation of events with that of another.'),
('RI.6.10', 'Reading Informational Text','By the end of the year, read and comprehend literary nonfiction in the grades 6–8 text complexity band proficiently.'),

-- Writing
('W.6.1',   'Writing',                   'Write arguments to support claims with clear reasons and relevant evidence.'),
('W.6.2',   'Writing',                   'Write informative/explanatory texts to examine a topic and convey ideas, concepts, and information through the selection, organization, and analysis of relevant content.'),
('W.6.3',   'Writing',                   'Write narratives to develop real or imagined experiences or events using effective technique, relevant descriptive details, and well-structured event sequences.'),
('W.6.4',   'Writing',                   'Produce clear and coherent writing in which the development, organization, and style are appropriate to task, purpose, and audience.'),
('W.6.5',   'Writing',                   'With some guidance and support from peers and adults, develop and strengthen writing as needed by planning, revising, editing, rewriting, or trying a new approach.'),
('W.6.6',   'Writing',                   'Use technology, including the Internet, to produce and publish writing as well as to interact and collaborate with others.'),
('W.6.7',   'Writing',                   'Conduct short research projects to answer a question, drawing on several sources and refocusing the inquiry when appropriate.'),
('W.6.8',   'Writing',                   'Gather relevant information from multiple print and digital sources; assess the credibility of each source; and quote or paraphrase the data and conclusions of others while avoiding plagiarism.'),
('W.6.9',   'Writing',                   'Draw evidence from literary or informational texts to support analysis, reflection, and research.'),
('W.6.10',  'Writing',                   'Write routinely over extended time frames and shorter time frames for a range of discipline-specific tasks, purposes, and audiences.'),

-- Speaking & Listening
('SL.6.1',  'Speaking & Listening',      'Engage effectively in a range of collaborative discussions with diverse partners on grade 6 topics, texts, and issues, building on others'' ideas and expressing their own clearly.'),
('SL.6.2',  'Speaking & Listening',      'Interpret information presented in diverse media and formats and explain how it contributes to a topic, text, or issue under study.'),
('SL.6.3',  'Speaking & Listening',      'Delineate a speaker''s argument and specific claims, distinguishing claims that are supported by reasons and evidence from claims that are not.'),
('SL.6.4',  'Speaking & Listening',      'Present claims and findings, sequencing ideas logically and using pertinent descriptions, facts, and details to accentuate main ideas or themes.'),
('SL.6.5',  'Speaking & Listening',      'Include multimedia components and visual displays in presentations to clarify information.'),
('SL.6.6',  'Speaking & Listening',      'Adapt speech to a variety of contexts and tasks, demonstrating command of formal English when indicated or appropriate.'),

-- Language
('L.6.1',   'Language',                  'Demonstrate command of the conventions of standard English grammar and usage when writing or speaking.'),
('L.6.2',   'Language',                  'Demonstrate command of the conventions of standard English capitalization, punctuation, and spelling when writing.'),
('L.6.3',   'Language',                  'Use knowledge of language and its conventions when writing, speaking, reading, or listening.'),
('L.6.4',   'Language',                  'Determine or clarify the meaning of unknown and multiple-meaning words and phrases based on grade 6 reading and content, choosing flexibly from a range of strategies.'),
('L.6.5',   'Language',                  'Demonstrate understanding of figurative language, word relationships, and nuances in word meanings.'),
('L.6.6',   'Language',                  'Acquire and use accurately grade-appropriate general academic and domain-specific words and phrases.')

on conflict (code) do nothing;

-- ============================================================
-- Assign HOD role (run after first sign-up)
-- Replace with your HOD's email address:
-- ============================================================
-- UPDATE public.profiles SET role = 'hod' WHERE email = 'hod@dubaischools.ae';
