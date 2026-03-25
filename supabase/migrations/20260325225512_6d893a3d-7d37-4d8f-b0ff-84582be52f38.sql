
CREATE OR REPLACE FUNCTION public.request_check(
  _student_id text,
  _points integer,
  _memo text DEFAULT 'Education reward'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _balance integer;
  _settings record;
  _check_id uuid;
  _check_number text;
  _currency_amount numeric;
BEGIN
  -- Verify caller owns this student
  IF NOT public.is_my_student(_student_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Validate points
  IF _points <= 0 THEN
    RAISE EXCEPTION 'Points must be positive';
  END IF;

  -- Check balance
  SELECT COALESCE(SUM(points), 0) INTO _balance
  FROM public.reward_points WHERE student_id = _student_id;

  IF _balance < _points THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  -- Get currency settings
  SELECT currency_code, currency_symbol, points_per_unit
  INTO _settings
  FROM public.currency_settings
  WHERE student_id = _student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Currency not configured';
  END IF;

  -- Calculate currency amount
  _currency_amount := _points::numeric / _settings.points_per_unit;

  -- Generate check number
  _check_number := 'IME-' || lpad((floor(random() * 900000 + 100000))::text, 6, '0');

  -- Deduct points
  INSERT INTO public.reward_points (student_id, points, reason, source)
  VALUES (_student_id, -_points, 'Check issued: ' || _check_number, 'check');

  -- Create digital check
  INSERT INTO public.digital_checks (
    student_id, amount_points, currency_amount,
    currency_code, currency_symbol, check_number, memo, status
  ) VALUES (
    _student_id, _points, _currency_amount,
    _settings.currency_code, _settings.currency_symbol,
    _check_number, _memo, 'issued'
  ) RETURNING id INTO _check_id;

  RETURN _check_id;
END;
$$;
