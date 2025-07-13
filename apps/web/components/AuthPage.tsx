"use client";

export function AuthPage({ isSignin }: { isSignin: boolean }) {
  function handleClick(isSignin: boolean): void {}

  return (
    <div className="w-screen h-screen bg-slate-700 text-black flex justify-center items-center">
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-lg space-y-6">
        <h2 className="text-2xl font-semibold text-center">
          {isSignin ? "Sign In" : "Sign Up"}
        </h2>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleClick(isSignin)}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-200"
          >
            {isSignin ? "Sign In" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
