import { useState } from "react";
import {
  LoginSocialFacebook,
  LoginSocialInstagram,
  LoginSocialLinkedin,
} from "reactjs-social-login";
import {
  FacebookLoginButton,
  InstagramLoginButton,
  LinkedInLoginButton,
} from "react-social-login-buttons";

// Cấu hình OAuth cho từng nền tảng
const FACEBOOK_APP_ID = "3161467347396014";
const INSTAGRAM_APP_ID = "3161467347396014"; // Instagram Business đi qua app Facebook
const LINKEDIN_CLIENT_ID = "YOUR_LINKEDIN_CLIENT_ID";
const LINKEDIN_CLIENT_SECRET = "YOUR_LINKEDIN_CLIENT_SECRET";

const FACEBOOK_SCOPE =
  "pages_show_list,pages_read_engagement,pages_manage_posts";
const INSTAGRAM_SCOPE =
  "pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,business_management";
const LINKEDIN_SCOPE = "r_liteprofile,r_emailaddress,w_member_social";

const EXCHANGE_URL = "https://zqzffq-3000.csb.app/facebook/exchange";
// Một endpoint duy nhất cho mọi thao tác, phân biệt bằng trường action
const AGENT_URL =
  "https://manhdungrpg.app.n8n.cloud/webhook/social-post-agent";

const PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

function App() {
  const [profile, setProfile] = useState(null);
  const [platform, setPlatform] = useState(""); // facebook | instagram | linkedin
  const [pages, setPages] = useState([]); // các trang/tài khoản quản lý được
  const [selectedPages, setSelectedPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState("");

  const [loadingDraft, setLoadingDraft] = useState(false);
  const [posting, setPosting] = useState(false);

  // Parse JSON an toàn: webhook có thể trả body rỗng hoặc không phải JSON
  const safeJson = async (res) => {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { draft_content: text };
    }
  };

  const togglePage = (page) => {
    setSelectedPages((prev) =>
      prev.some((p) => p.id === page.id)
        ? prev.filter((p) => p.id !== page.id)
        : [...prev, page]
    );
  };

  // Đổi token Facebook ngắn hạn -> dài hạn (dùng chung cho FB & Instagram)
  const exchangeLongToken = async (token) => {
    try {
      const response = await fetch(EXCHANGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      });
      const data = await safeJson(response);
      return data.longLivedToken || data.access_token || token;
    } catch (error) {
      console.log("exchange error", error);
      return token;
    }
  };

  // Lấy danh sách Page Facebook mà tài khoản quản lý
  const getFacebookPages = async (token) => {
    const longToken = await exchangeLongToken(token);
    const res = await fetch(
      `https://graph.facebook.com/v23.0/me/accounts?fields=id,name,access_token,picture&access_token=${longToken}`
    );
    const data = await res.json();
    return (data.data || []).map((page) => ({
      id: page.id,
      name: page.name,
      picture: page.picture?.data?.url || "",
      access_token: page.access_token,
      platform: "facebook",
    }));
  };

  // Lấy các tài khoản Instagram Business gắn với Page Facebook
  const getInstagramAccounts = async (token) => {
    const longToken = await exchangeLongToken(token);
    const res = await fetch(
      `https://graph.facebook.com/v23.0/me/accounts?fields=name,access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${longToken}`
    );
    const data = await res.json();
    return (data.data || [])
      .filter((page) => page.instagram_business_account)
      .map((page) => {
        const ig = page.instagram_business_account;
        return {
          id: ig.id,
          name: ig.username || page.name,
          picture: ig.profile_picture_url || "",
          access_token: page.access_token,
          platform: "instagram",
        };
      });
  };

  // LinkedIn: dùng profile cá nhân làm tài khoản đăng bài
  const getLinkedinAccounts = (data) => {
    const name =
      data.name ||
      `${data.localizedFirstName || ""} ${
        data.localizedLastName || ""
      }`.trim() ||
      "LinkedIn Profile";
    return [
      {
        id: data.id || data.sub || "linkedin-profile",
        name,
        picture: data.picture || "",
        access_token: data.access_token || "",
        platform: "linkedin",
      },
    ];
  };

  // Sau khi đăng nhập xong: nạp danh sách trang/tài khoản theo nền tảng
  const handleLogin = async (loginPlatform, response) => {
    const user = response.data;
    setProfile(user);
    setPlatform(loginPlatform);
    setSelectedPages([]);
    setLoadingPages(true);

    try {
      let accounts = [];
      if (loginPlatform === "facebook") {
        accounts = await getFacebookPages(user.accessToken);
      } else if (loginPlatform === "instagram") {
        accounts = await getInstagramAccounts(user.accessToken);
      } else if (loginPlatform === "linkedin") {
        accounts = getLinkedinAccounts(user);
      }
      setPages(accounts);
    } catch (error) {
      console.log("load accounts error", error);
      setPages([]);
    } finally {
      setLoadingPages(false);
    }
  };

  const logout = () => {
    setProfile(null);
    setPlatform("");
    setPages([]);
    setSelectedPages([]);
    setDraft("");
    setPrompt("");
  };

  // action: "create" -> tạo bài mới, "revise" -> chỉnh sửa draft hiện có
  const requestDraft = async (action) => {
    if (!prompt.trim()) {
      alert(
        action === "revise"
          ? "Nhập yêu cầu chỉnh sửa bài viết"
          : "Nhập yêu cầu tạo bài viết"
      );
      return;
    }
    if (action === "revise" && !draft.trim()) {
      alert("Chưa có draft để chỉnh sửa");
      return;
    }

    try {
      setLoadingDraft(true);

      const response = await fetch(AGENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          prompt,
          platform,
          currentDraft: action === "revise" ? draft : "",
          pageNames: selectedPages.map((p) => p.name),
        }),
      });

      const data = await safeJson(response);
      setDraft(data.draft_content || data.content || data.text || "");
    } catch (error) {
      console.log(error);
      alert(
        action === "revise"
          ? "Không chỉnh sửa được bài viết"
          : "Không tạo được bài viết"
      );
    } finally {
      setLoadingDraft(false);
    }
  };

  const generateDraft = () => requestDraft("create");
  const reviseDraft = () => requestDraft("revise");

  const publishPost = async () => {
    if (selectedPages.length === 0) {
      alert("Vui lòng chọn ít nhất một trang/tài khoản");
      return;
    }
    if (!draft.trim()) {
      alert("Chưa có nội dung bài viết");
      return;
    }

    try {
      setPosting(true);

      const results = await Promise.all(
        selectedPages.map((page) =>
          fetch(AGENT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "publish",
              platform,
              pageId: page.id,
              pageName: page.name,
              pageAccessToken: page.access_token,
              content: draft,
            }),
          }).then((res) => safeJson(res))
        )
      );

      console.log(results);
      alert(
        `Đăng lên ${PLATFORM_LABELS[platform]} thành công (${selectedPages.length} trang)`
      );
    } catch (error) {
      console.log(error);
      alert(`Đăng lên ${PLATFORM_LABELS[platform]} thất bại`);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: 30,
      }}
    >
      {!profile ? (
        <div style={{ maxWidth: 400, margin: "100px auto" }}>
          <h2 style={{ textAlign: "center", marginBottom: 24 }}>
            Đăng nhập để đăng bài
          </h2>

          <LoginSocialFacebook
            appId={FACEBOOK_APP_ID}
            scope={FACEBOOK_SCOPE}
            onResolve={(response) => handleLogin("facebook", response)}
            onReject={(error) => console.log(error)}
          >
            <FacebookLoginButton />
          </LoginSocialFacebook>

          <LoginSocialInstagram
            client_id={INSTAGRAM_APP_ID}
            scope={INSTAGRAM_SCOPE}
            redirect_uri={window.location.href}
            onResolve={(response) => handleLogin("instagram", response)}
            onReject={(error) => console.log(error)}
          >
            <InstagramLoginButton />
          </LoginSocialInstagram>

          <LoginSocialLinkedin
            client_id={LINKEDIN_CLIENT_ID}
            client_secret={LINKEDIN_CLIENT_SECRET}
            scope={LINKEDIN_SCOPE}
            redirect_uri={window.location.href}
            onResolve={(response) => handleLogin("linkedin", response)}
            onReject={(error) => console.log(error)}
          >
            <LinkedInLoginButton />
          </LoginSocialLinkedin>
        </div>
      ) : (
        <>
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 12,
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2>{profile.name}</h2>
              <p>
                {PLATFORM_LABELS[platform]}
                {profile.email ? ` · ${profile.email}` : ""}
              </p>
            </div>
            <button
              onClick={logout}
              style={{
                padding: "8px 16px",
                border: "1px solid #ddd",
                borderRadius: 8,
                cursor: "pointer",
                background: "#fff",
              }}
            >
              Đăng xuất
            </button>
          </div>

          <h2>Trang / tài khoản quản lý ({PLATFORM_LABELS[platform]})</h2>

          {loadingPages ? (
            <p>Đang tải danh sách...</p>
          ) : pages.length === 0 ? (
            <p>
              Không tìm thấy trang/tài khoản nào để đăng bài với quyền
              hiện tại.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill,minmax(250px,1fr))",
                gap: 20,
                marginTop: 20,
              }}
            >
              {pages.map((page) => {
                const isSelected = selectedPages.some(
                  (p) => p.id === page.id
                );
                return (
                  <div
                    key={page.id}
                    onClick={() => togglePage(page)}
                    style={{
                      background: isSelected ? "#1877f2" : "#fff",
                      color: isSelected ? "#fff" : "#000",
                      border: "1px solid #ddd",
                      borderRadius: 12,
                      padding: 20,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {page.picture && (
                      <img
                        src={page.picture}
                        alt={page.name}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <div>
                      <h3 style={{ margin: 0 }}>{page.name}</h3>
                      <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>
                        {page.id}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedPages.length > 0 && (
            <div
              style={{
                marginTop: 30,
                background: "#fff",
                padding: 20,
                borderRadius: 12,
              }}
            >
              <h2>
                Đã chọn: {selectedPages.map((p) => p.name).join(", ")}
              </h2>

              <h3>Yêu cầu tạo bài viết</h3>

              <textarea
                rows={5}
                style={{ width: "100%", padding: 12 }}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: Viết bài giới thiệu dịch vụ AI cho doanh nghiệp..."
              />

              <div style={{ display: "flex", gap: 12, marginTop: 15 }}>
                <button
                  onClick={generateDraft}
                  disabled={loadingDraft}
                  style={{
                    padding: "12px 24px",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  {loadingDraft ? "Đang xử lý..." : "Tạo bài viết"}
                </button>

                {draft && (
                  <button
                    onClick={reviseDraft}
                    disabled={loadingDraft}
                    style={{
                      padding: "12px 24px",
                      border: "1px solid #1877f2",
                      borderRadius: 8,
                      background: "#fff",
                      color: "#1877f2",
                      cursor: "pointer",
                    }}
                  >
                    {loadingDraft ? "Đang xử lý..." : "Chỉnh sửa lại"}
                  </button>
                )}
              </div>

              {draft && (
                <>
                  <h3 style={{ marginTop: 30 }}>Draft bài viết</h3>

                  <textarea
                    rows={10}
                    style={{ width: "100%", padding: 12 }}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />

                  <button
                    onClick={publishPost}
                    disabled={posting}
                    style={{
                      marginTop: 15,
                      padding: "12px 24px",
                      border: "none",
                      borderRadius: 8,
                      background: "#1877f2",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {posting
                      ? "Đang đăng..."
                      : `Đăng lên ${PLATFORM_LABELS[platform]}`}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
