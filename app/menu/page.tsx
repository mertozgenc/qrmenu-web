export const dynamic = "force-dynamic";
export const revalidate = 0;

import MenuClient from "./MenuClient";

export default function Page() {
  return (
    <>
      <div
        style={{
          background: "red",
          color: "white",
          padding: "12px",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        TEST DEPLOY OK 🚀
      </div>

      <MenuClient />
    </>
  );
}
