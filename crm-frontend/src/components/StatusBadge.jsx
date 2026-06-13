const STATUS_MAP = {
  // Campaign-level statuses — filled badges
  draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600'    },
  sending:   { label: 'Sending',   cls: 'bg-blue-100 text-blue-700'    },
  sent:      { label: 'Sent',      cls: 'bg-blue-100 text-blue-700'    },
  completed: { label: 'Completed', cls: 'bg-green-100 text-green-700'  },

  // Communication-level statuses — dot + label
  delivered: { label: 'Delivered', dot: 'bg-green-500'  },
  opened:    { label: 'Opened',    dot: 'bg-purple-500' },
  clicked:   { label: 'Clicked',   dot: 'bg-orange-500' },
  failed:    { label: 'Failed',    dot: 'bg-red-500'    },
};

export default function StatusBadge({ status }) {
  const config = STATUS_MAP[status];

  if (!config) {
    return (
      <span className="rounded-full bg-gray-100 text-gray-500 px-3 py-1 text-xs font-semibold capitalize">
        {status}
      </span>
    );
  }

  // Dot-style badge (communication statuses)
  if (config.dot) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 capitalize">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />
        {config.label}
      </span>
    );
  }

  // Filled badge (campaign statuses)
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.cls}`}>
      {config.label}
    </span>
  );
}
