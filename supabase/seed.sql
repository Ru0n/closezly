-- Seed data for Closezly application

-- Insert a test user
INSERT INTO public.users (id, email, full_name, company, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User', 'Test Company', NOW());

-- Insert user profile
INSERT INTO public.user_profiles (user_id, job_title, preferences, settings)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Sales Representative', 
   '{"theme": "light", "notifications": true}'::jsonb, 
   '{"autoTranscribe": true, "saveRecordings": false}'::jsonb);

-- Insert sample document
INSERT INTO public.documents (id, user_id, title, description, file_type, status)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 
   'Sales Playbook', 'Company sales playbook with common objections and responses', 
   'pdf', 'processed');

-- Insert sample document chunks
INSERT INTO public.document_chunks (id, user_id, content, metadata)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 
   'When a customer objects to the price, emphasize the ROI and long-term value.', 
   '{"source": "Sales Playbook", "page": 12, "section": "Objection Handling"}'::jsonb),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 
   'For enterprise clients, focus on scalability and integration capabilities.', 
   '{"source": "Sales Playbook", "page": 15, "section": "Enterprise Sales"}'::jsonb);

-- Insert sample call transcript
INSERT INTO public.call_transcripts (transcript_id, user_id, call_start_time, call_end_time, full_transcript, transcript_segments)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 
   NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes', 
   'This is a sample call transcript with a potential customer discussing our product features and pricing.', 
   '[
     {"speaker": "user", "text": "Hi, thanks for taking the time to chat today.", "timestamp": "00:00:05"},
     {"speaker": "customer", "text": "No problem, I''m interested in learning more about your solution.", "timestamp": "00:00:10"},
     {"speaker": "user", "text": "Great! Let me walk you through our key features.", "timestamp": "00:00:15"}
   ]'::jsonb);

-- Insert sample call summary
INSERT INTO public.call_summaries (summary_id, transcript_id, summary_text, key_points, action_items)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 
   'Initial discovery call with potential customer. Discussed product features and pricing. Customer showed interest but had concerns about implementation timeline.', 
   '[
     "Customer is looking for a solution to improve sales efficiency",
     "Price point is within their budget range",
     "Implementation timeline is a concern"
   ]'::jsonb, 
   '[
     "Send follow-up email with implementation timeline details",
     "Schedule technical demo with IT team",
     "Prepare custom ROI calculation"
   ]'::jsonb);
