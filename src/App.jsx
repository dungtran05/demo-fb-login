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

  const getPages = async (token) => {
    try {
      const response = await fetch(
        "http://localhost:3000/facebook/exchange",
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

      console.log("BACKEND RESPONSE:", data);

      setLongLivedToken(data.longLivedToken);

      const pageResponse = await fetch(
        `https://graph.facebook.com/v23.0/me/accounts?access_token=${data.longLivedToken}`
      );

      const pageData = await pageResponse.json();

      console.log("PAGES:", pageData);

      if (pageData.data) {
        setPages(pageData.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const submitPost = async () => {
    if (!selectedPage) {
      alert("Vui lòng chọn trang");
      return;
    }

    if (!content.trim()) {
      alert("Vui lòng nhập nội dung");
      return;
    }

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
    } catch (error) {
      console.log(error);
      alert("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        padding: "30px",
      }}
    >
      {!profile ? (
        <div
          style={{
            maxWidth: "400px",
            margin: "100px auto",
          }}
        >
          <LoginSocialFacebook
            appId="2750614468645383"
            scope="pages_show_list,pages_read_engagement,pages_manage_posts"
            onResolve={(response) => {
              console.log("LOGIN RESPONSE:", response);

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
              padding: "20px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "20px",
              marginBottom: "30px",
            }}
          >
            <img
              src={profile.picture.data.url}
              alt=""
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
              }}
            />

            <div>
              <h2>{profile.name}</h2>
            </div>
          </div>

          <h3>User Access Token</h3>

          <textarea
            rows={4}
            cols={100}
            value={profile.accessToken}
            readOnly
          />

          <h3>Long Lived Token</h3>

          <textarea
            rows={4}
            cols={100}
            value={longLivedToken}
            readOnly
          />

          <h2 style={{ marginTop: "30px" }}>
            Danh sách trang
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill,minmax(250px,1fr))",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            {pages.map((page) => (
              <div
                key={page.id}
                onClick={() => setSelectedPage(page)}
                style={{
                  padding: "20px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  background:
                    selectedPage?.id === page.id
                      ? "#1877f2"
                      : "#fff",
                  color:
                    selectedPage?.id === page.id
                      ? "#fff"
                      : "#000",
                  border: "1px solid #ddd",
                }}
              >
                <h3>{page.name}</h3>
                <p>{page.id}</p>
              </div>
            ))}
          </div>

          {selectedPage && (
            <div
              style={{
                marginTop: "30px",
                background: "#fff",
                padding: "20px",
                borderRadius: "12px",
              }}
            >
              <h2>
                Đăng bài lên: {selectedPage.name}
              </h2>

              <textarea
                rows={8}
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "10px",
                }}
                placeholder="Nhập nội dung bài viết..."
                value={content}
                onChange={(e) =>
                  setContent(e.target.value)
                }
              />

              <button
                onClick={submitPost}
                disabled={loading}
                style={{
                  marginTop: "15px",
                  padding: "12px 24px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#1877f2",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {loading
                  ? "Đang gửi..."
                  : "Gửi tới n8n"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;