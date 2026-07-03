
DROP POLICY IF EXISTS authenticated_scoped_topics ON realtime.messages;

CREATE POLICY authenticated_scoped_topics ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
  OR realtime.topic() LIKE ('inbox:' || auth.uid()::text || '%')
  OR realtime.topic() LIKE ('inbox-badge:' || auth.uid()::text || '%')
  OR realtime.topic() LIKE ('inbox_realtime:' || auth.uid()::text || '%')
);
