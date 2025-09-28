{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/release-25.05";
  };

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forEachSupportedSystem = f: nixpkgs.lib.genAttrs supportedSystems (system: f {
        pkgs = import nixpkgs { inherit system; };
      });
    in
    {
      devShells = forEachSupportedSystem ({ pkgs }: {
        default = with pkgs.nodePackages; pkgs.mkShell {
          packages = [
            pnpm
            nodejs
            typescript-language-server
          ];
          shellHook = ''
            if [ ! -d "node_modules" ]; then
              pnpm i
            fi
            PATH=$PWD/node_modules/.bin:$PATH
          '';
        };
      });
    };
}
