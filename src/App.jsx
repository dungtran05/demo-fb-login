import { useState } from "react";
import { LoginSocialFacebook } from "reactjs-social-login";
import { FacebookLoginButton } from "react-social-login-buttons";

function App() {
  const [profile, setProfile] = useState(null);
  const [pages, setPages] = useState([]);
  const [longLivedToken, setLongLivedToken] = useState("");
  const [selectedPage, setSelectedPage] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const getPages = async (accessToken) => {
    try {
      console.log("SEND TO BACKEND TOKEN:", accessToken);

      const response = await fetch(
        "https://zqzffq-3000.csb.app/facebook/exchange",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accessToken }),
        }
      );

      const data = await response.json();
      console.log("BACKEND RESPONSE:", data);

      if (!data.longLivedToken) {
        alert("Không lấy được long lived token");
        return;
      }

      setLongLivedToken(data.longLivedToken);

      const pageResponse = await fetch(
        `https://graph.facebook.com/v23.0/me/accounts?access_token=${data.longLivedToken}`
      );

      const pageData = await pageResponse.json();
      console.log("PAGES:", pageData);

      if (pageData.error) {
        alert(pageData.error.message);
        return;
      }

      setPages(pageData.data || []);
    } catch (error) {
      console.log(error);
    }
  };

  const submitPost = async () => {
    if (!selectedPage) return alert("Chọn page trước");
    if (!content.trim()) return alert("Nhập nội dung");

    try {
      setLoading(true);

      await fetch(
        "https://manhdungrpg.app.n8n.cloud/webhook-test/facebook-post",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pageId: selectedPage.id,
            pageName: selectedPage.name,
            pageAccessToken: selectedPage.access_token,
            content,
          }),
        }
      );

      alert("Đã gửi tới n8n");
      setContent("");
    } catch (err) {
      console.log(err);
      alert("Lỗi khi gửi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: 30, background: "#f4f6f8" }}>
      {!profile ? (
        <div style={{ maxWidth: 400, margin: "100px auto" }}>
          <LoginSocialFacebook
            appId="2750614468645383"
            scope="public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts"
            onResolve={(response) => {
              console.log("LOGIN RESPONSE:", response);

              const user = response.data;

              const token =
                user.accessToken ||
                user.access_token ||
                response.data?.accessToken;

              if (!token) {
                alert("Không lấy được access token");
                return;
              }

              setProfile(user);

              getPages(token);
            }}
            onReject={(err) => console.log(err)}
          >
            <FacebookLoginButton />
          </LoginSocialFacebook>
        </div>
      ) : (
        <div>
          <div style={{ background: "#fff", padding: 20, borderRadius: 12 }}>
            <h2>{profile.name}</h2>
          </div>

          <h3>User Access Token</h3>
          <textarea rows={4} value={profile.accessToken || ""} readOnly />

          <h3>Long Lived Token</h3>
          <textarea rows={4} value={longLivedToken} readOnly />

          <h2>Pages</h2>

          <div style={{ display: "grid", gap: 10 }}>
            {pages.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPage(p)}
                style={{
                  padding: 15,
                  border: "1px solid #ddd",
                  cursor: "pointer",
                  background:
                    selectedPage?.id === p.id ? "#1877f2" : "#fff",
                  color:
                    selectedPage?.id === p.id ? "#fff" : "#000",
                }}
              >
                {p.name}
              </div>
            ))}
          </div>

          {selectedPage && (
            <div style={{ marginTop: 20 }}>
              <h3>Post to {selectedPage.name}</h3>

              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ width: "100%" }}
              />

              <button onClick={submitPost} disabled={loading}>
                {loading ? "Sending..." : "Send to n8n"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;