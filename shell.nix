{ pkgs ? import <nixpkgs> { } }:

with pkgs;

mkShell {

  nativeBuildInputs = with pkgs; [ bashInteractive ];
  buildInputs = with pkgs; [ nodejs-18_x nodePackages.prisma prisma-engines ];
  shellHook = with pkgs; ''
    export BROWSER=none
    export NODE_OPTIONS="--no-experimental-fetch"
    export PRISMA_SCHEMA_ENGINE_BINARY="${prisma-engines}/bin/migration-engine"
    export PRISMA_QUERY_ENGINE_BINARY="${prisma-engines}/bin/query-engine"
    export PRISMA_QUERY_ENGINE_LIBRARY="${prisma-engines}/lib/libquery_engine.node"
    export PRISMA_INTROSPECTION_ENGINE_BINARY="${prisma-engines}/bin/introspection-engine"
    export PRISMA_FMT_BINARY="${prisma-engines}/bin/prisma-fmt"
  '';
}
