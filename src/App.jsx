import { useState } from "react";
import { LoginSocialFacebook } from "reactjs-social-login";
import { FacebookLoginButton } from "react-social-login-buttons";
function App() {
  const [profile, setProfile] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);

  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState("");

  const [loadingDraft, setLoadingDraft] = useState(false);
  const [posting, setPosting] = useState("");

  const togglePage = (page) => {
    setSelectedPages((prev) =>
      prev.some((p) => p.id === page.id)
        ? prev.filter((p) => p.id !== page.id)
        : [...prev, page]
    );
  };

  const getPages = async (token) => {
    try {
      const response = await fetch(
        "https://zqzffq-3000.csb.app/facebook/exchange",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accessToken: token,
          }),
        }
      );

      const data = await response.json();

      const longToken = data.longLivedToken || data.access_token;

      const pageResponse = await fetch(
        `https://graph.facebook.com/v23.0/me/accounts?access_token=${longToken}`
      );

      const pageData = await pageResponse.json();

      setPages(pageData.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  const generateDraft = async () => {
    if (!prompt.trim()) {
      alert("Nhập yêu cầu tạo bài viết");
      return;
    }

    try {
      setLoadingDraft(true);

      const response = await fetch(
        "https://thanh08.app.n8n.cloud/webhook/create-draft",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            action: "generate",
            pageNames: selectedPages.map((p) => p.name),
          }),
        }
      );

      const data = await response.json();

      setDraft(data.draft_content || "");
      console.log(data);
    } catch (error) {
      console.log(error);
      alert("Không tạo được bài viết");
    } finally {
      setLoadingDraft(false);
    }
  };

  const publishPost = async (platform) => {
    if (selectedPages.length === 0) {
      alert("Vui lòng chọn ít nhất một page");
      return;
    }

    if (!draft.trim()) {
      alert("Chưa có nội dung bài viết");
      return;
    }

    try {
      setPosting(platform);

      const results = await Promise.all(
        selectedPages.map((page) =>
          fetch("https://thanh08.app.n8n.cloud/webhook/publish-post", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              platform,
              pageId: page.id,
              pageName: page.name,
              pageAccessToken: page.access_token,
              content: draft,
              action: "publish",
            }),
          }).then((res) => res.json())
        )
      );

      console.log(results);

      alert(
        `Đăng lên ${platform} thành công (${selectedPages.length} page)`
      );
    } catch (error) {
      console.log(error);
      alert(`Đăng lên ${platform} thất bại`);
    } finally {
      setPosting("");
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
        <div
          style={{
            maxWidth: 400,
            margin: "100px auto",
          }}
        >
          <LoginSocialFacebook
            appId="3161467347396014"
            scope="pages_show_list,pages_read_engagement,pages_manage_posts"
            onResolve={(response) => {
              const user = response.data;

              setProfile(user);

              getPages(user.accessToken);
            }}
            onReject={(error) => {
              console.log(error);
            }}
          >
            <FacebookLoginButton />
          </LoginSocialFacebook>
        </div>
      ) : (
        <>
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
          </div>

          <h2>Danh sách Page</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill,minmax(250px,1fr))",
              gap: 20,
              marginTop: 20,
            }}
          >
            {pages.map((page) => (
              <div
                key={page.id}
                onClick={() => togglePage(page)}
                style={{
                  background:
                    selectedPages.some((p) => p.id === page.id)
                      ? "#1877f2"
                      : "#fff",
                  color:
                    selectedPages.some((p) => p.id === page.id)
                      ? "#fff"
                      : "#000",
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 20,
                  cursor: "pointer",
                }}
              >
                <h3>{page.name}</h3>
                <p>{page.id}</p>
              </div>
            ))}
          </div>

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
                Page đã chọn:{" "}
                {selectedPages.map((p) => p.name).join(", ")}
              </h2>

              <h3>Yêu cầu tạo bài viết</h3>

              <textarea
                rows={5}
                style={{
                  width: "100%",
                  padding: 12,
                }}
                value={prompt}
                onChange={(e) =>
                  setPrompt(e.target.value)
                }
                placeholder="Ví dụ: Viết bài giới thiệu dịch vụ AI cho doanh nghiệp..."
              />

              <button
                onClick={generateDraft}
                disabled={loadingDraft}
                style={{
                  marginTop: 15,
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                {loadingDraft
                  ? "Đang tạo..."
                  : "Tạo bài viết"}
              </button>

              {draft && (
                <>
                  <h3
                    style={{
                      marginTop: 30,
                    }}
                  >
                    Draft bài viết
                  </h3>

                  <textarea
                    rows={10}
                    style={{
                      width: "100%",
                      padding: 12,
                    }}
                    value={draft}
                    onChange={(e) =>
                      setDraft(e.target.value)
                    }
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
                      : "Đăng lên Facebook"}
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