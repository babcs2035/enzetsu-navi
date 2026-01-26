-- 街頭演説ナビ データベース初期化スクリプト

-- 政党テーブル
CREATE TABLE IF NOT EXISTS parties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 候補者テーブル
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    party_id INT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 演説データテーブル
CREATE TABLE IF NOT EXISTS speeches (
    id SERIAL PRIMARY KEY,
    candidate_id INT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    start_at TIMESTAMP NOT NULL,
    location_name TEXT NOT NULL,
    address TEXT,
    lat FLOAT,
    lng FLOAT,
    source_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ジオコーディングキャッシュテーブル
CREATE TABLE IF NOT EXISTS geocode_cache (
    id SERIAL PRIMARY KEY,
    location_name TEXT NOT NULL UNIQUE,
    address TEXT,
    lat FLOAT,
    lng FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_speeches_start_at ON speeches(start_at);
CREATE INDEX IF NOT EXISTS idx_speeches_candidate_id ON speeches(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidates_party_id ON candidates(party_id);
CREATE INDEX IF NOT EXISTS idx_geocode_cache_location_name ON geocode_cache(location_name);

-- 重複排除用のユニーク制約
CREATE UNIQUE INDEX IF NOT EXISTS idx_speeches_unique 
ON speeches(candidate_id, start_at, location_name);

-- 初期データ: 主要政党
INSERT INTO parties (name, color) VALUES
    ('自由民主党', '#314b9b'),
    ('立憲民主党', '#1e4d8e'),
    ('日本維新の会', '#38b16a'),
    ('公明党', '#f39800'),
    ('日本共産党', '#db0027'),
    ('国民民主党', '#ffb700'),
    ('れいわ新選組', '#ed6d8a'),
    ('社会民主党', '#22a7e5'),
    ('参政党', '#ff8c00'),
    ('無所属', '#808080')
ON CONFLICT (name) DO NOTHING;

-- 更新日時自動更新用トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルへのトリガー適用
DROP TRIGGER IF EXISTS update_parties_updated_at ON parties;
CREATE TRIGGER update_parties_updated_at
    BEFORE UPDATE ON parties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_candidates_updated_at ON candidates;
CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_speeches_updated_at ON speeches;
CREATE TRIGGER update_speeches_updated_at
    BEFORE UPDATE ON speeches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
