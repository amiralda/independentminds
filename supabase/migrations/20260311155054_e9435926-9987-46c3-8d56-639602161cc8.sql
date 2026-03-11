-- Fix: Add UNIQUE constraint on students.student_id to prevent cross-tenant access
ALTER TABLE public.students ADD CONSTRAINT students_student_id_unique UNIQUE (student_id);