import Link from "next/link";

export default function Navbar() {
  return (
    <nav>
      <h3>SAfe_T</h3>
      <div>
        <Link href="/">Home</Link> |{" "}
        <Link href="/login">Login</Link> |{" "}
        <Link href="/signup">Signup</Link>
      </div>
    </nav>
  );
}
