-- Official certification attempts are finalised only by finalize_certification_exam_attempt with an active secure session.
REVOKE EXECUTE ON FUNCTION public.score_certification_exam(UUID) FROM authenticated;
