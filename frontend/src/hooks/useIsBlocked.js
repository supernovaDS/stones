import { useAppStore } from "../store/useAppStore";

export function useIsBlocked(task) {
  const blocks = useAppStore((state) => state.blocks);
  return (task.content.dependencyIds ?? []).some((id) => {
    const dependency = blocks.find((block) => block.id === id);
    return dependency?.type === "task" && !dependency.metadata.completed;
  });
}
