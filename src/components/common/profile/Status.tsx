import React, { useMemo } from "react";

import Tooltip from "~/components/common/Tootip";
import { getColorForUser } from "~/utils/color";
import { getIconForUser } from "~/utils/icon";

interface StatusProps {
  nickname: string;
}

const Status: React.FC<StatusProps> = React.memo(({ nickname }) => {
  const color = useMemo(() => getColorForUser(nickname), [nickname]);
  const IconComponent = useMemo(() => getIconForUser(nickname), [nickname]);

  return (
    <Tooltip content={nickname}>
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100"
        style={{
          border: `2px solid ${color}`,
        }}
      >
        <IconComponent size={24} color={color} />
      </div>
    </Tooltip>
  );
});

Status.displayName = "Status";

export default Status;
