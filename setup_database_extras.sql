-- ============================================================
-- SUPABASE EXTRA SCHEMA ELEMENTS (Triggers, Functions, RLS, Search config)
-- ============================================================

-- ============================================
-- 1. HELPER FUNCTIONS
-- ============================================

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update tutor rating when review changes
CREATE OR REPLACE FUNCTION update_tutor_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tutor_profiles
    SET 
        rating = (SELECT COALESCE(AVG(rating)::NUMERIC(2,1), 0) FROM reviews WHERE tutor_id = NEW.tutor_id AND is_visible = TRUE),
        review_count = (SELECT COUNT(*) FROM reviews WHERE tutor_id = NEW.tutor_id AND is_visible = TRUE)
    WHERE tutor_id = NEW.tutor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update schedule booked status when booking changes
CREATE OR REPLACE FUNCTION update_schedule_booked_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' THEN
        UPDATE course_schedules SET is_booked = TRUE WHERE schedule_id = NEW.schedule_id;
    ELSIF NEW.status IN ('cancelled', 'refunded') THEN
        UPDATE course_schedules SET is_booked = FALSE WHERE schedule_id = NEW.schedule_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sync new auth user to public.users (triggers when users register in Supabase Auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (user_id, email, full_name, phone, role, status, created_at, updated_at)
    VALUES (
        NEW.id, 
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')::"UserRole",
        'active',
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to sync user creation
CREATE OR REPLACE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create profile and wallet on public user insertion
CREATE OR REPLACE FUNCTION public.auto_create_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'tutor' THEN
        INSERT INTO public.tutor_profiles (user_id) VALUES (NEW.user_id) ON CONFLICT DO NOTHING;
    ELSIF NEW.role = 'student' THEN
        INSERT INTO public.student_profiles (user_id) VALUES (NEW.user_id) ON CONFLICT DO NOTHING;
    END IF;
    -- Auto-create wallet
    INSERT INTO public.wallets (user_id) VALUES (NEW.user_id) ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 2. TRIGGERS SETUP
-- ============================================

-- Updated at triggers
CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_tutor_profiles_updated_at
    BEFORE UPDATE ON tutor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_tutor_certificates_updated_at
    BEFORE UPDATE ON tutor_certificates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Booking update schedule trigger
CREATE OR REPLACE TRIGGER trg_bookings_update_schedule
    AFTER UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_schedule_booked_status();

-- Review rating trigger
CREATE OR REPLACE TRIGGER trg_reviews_update_rating
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_tutor_rating();

-- User auto profile trigger
CREATE OR REPLACE TRIGGER trg_users_auto_profile
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION public.auto_create_profile();

-- ============================================
-- 3. FULL-TEXT SEARCH (VIETNAMESE)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_ts_config 
        WHERE cfgname = 'vietnamese'
    ) THEN
        CREATE TEXT SEARCH CONFIGURATION vietnamese (COPY = simple);
        ALTER TEXT SEARCH CONFIGURATION vietnamese
            ALTER MAPPING FOR asciiword, word WITH unaccent, simple;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_tutor_profiles_fts ON tutor_profiles
    USING gin (to_tsvector('vietnamese', COALESCE(bio, '') || ' ' || COALESCE(education, '')));

CREATE INDEX IF NOT EXISTS idx_courses_fts ON courses
    USING gin (to_tsvector('vietnamese', COALESCE(title, '') || ' ' || COALESCE(description, '')));

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- USERS policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = user_id OR role = 'admin');
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = user_id);

-- TUTOR_PROFILES policies
CREATE POLICY "Tutor profiles public view" ON tutor_profiles
    FOR SELECT USING (verified_status = 'approved' OR auth.uid() = user_id);
CREATE POLICY "Tutors can update own profile" ON tutor_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- STUDENT_PROFILES policies
CREATE POLICY "Students own profile" ON student_profiles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students update own profile" ON student_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- COURSES policies
CREATE POLICY "Courses public view" ON courses
    FOR SELECT USING (status = 'published');
CREATE POLICY "Tutors manage own courses" ON courses
    FOR ALL USING (auth.uid() = (SELECT user_id FROM tutor_profiles WHERE tutor_id = courses.tutor_id));

-- BOOKINGS policies
CREATE POLICY "Students view own bookings" ON bookings
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM student_profiles WHERE student_id = bookings.student_id));
CREATE POLICY "Tutors view bookings of their courses" ON bookings
    FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM tutor_profiles WHERE tutor_id = (SELECT tutor_id FROM courses WHERE course_id = bookings.course_id))
    );
CREATE POLICY "Students create bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM student_profiles WHERE student_id = bookings.student_id));

-- MESSAGES policies
CREATE POLICY "Users view messages in their rooms" ON messages
    FOR SELECT USING (
        auth.uid() IN (
            SELECT value::UUID FROM jsonb_array_elements_text(
                (SELECT participants FROM chat_rooms WHERE room_id = messages.room_id)
            )
        )
    );
CREATE POLICY "Users send messages to their rooms" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        auth.uid() IN (
            SELECT value::UUID FROM jsonb_array_elements_text(
                (SELECT participants FROM chat_rooms WHERE room_id = messages.room_id)
            )
        )
    );

-- WALLETS policies
CREATE POLICY "Users view own wallet" ON wallets
    FOR SELECT USING (auth.uid() = user_id);

-- REVIEWS policies
CREATE POLICY "Reviews public view" ON reviews
    FOR SELECT USING (is_visible = TRUE);
CREATE POLICY "Students create own reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM student_profiles WHERE student_id = reviews.student_id));

-- FAVORITES policies
CREATE POLICY "Students own favorites" ON favorites
    FOR ALL USING (auth.uid() = (SELECT user_id FROM student_profiles WHERE student_id = favorites.student_id));

-- DOCUMENTS policies
CREATE POLICY "Documents public view" ON documents
    FOR SELECT USING (TRUE);
CREATE POLICY "Tutors upload documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM courses JOIN tutor_profiles USING(tutor_id) WHERE course_id = documents.course_id));

-- ATTENDANCES policies
CREATE POLICY "Users view own attendance" ON attendances
    FOR SELECT USING (auth.uid() = user_id);

-- TRANSACTIONS policies
CREATE POLICY "Users view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 5. DEFAULT SEED CONFIGURATIONS
-- ============================================
INSERT INTO system_configs (config_key, config_value, description) VALUES
('platform_fee_percent', '10', 'Phần trăm phí nền tảng trừ trên mỗi booking'),
('min_payout_amount', '500000', 'Số tiền tối thiểu để yêu cầu payout (VND)'),
('booking_cancel_hours', '24', 'Số giờ trước buổi học được phép hủy miễn phí'),
('recording_expire_days', '30', 'Số ngày lưu trữ video ghi hình'),
('max_file_upload_mb', '50', 'Dung lượng file upload tối đa (MB)')
ON CONFLICT (config_key) DO NOTHING;
